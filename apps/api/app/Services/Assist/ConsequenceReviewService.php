<?php

namespace App\Services\Assist;

use App\Models\DialogueNode;
use App\Models\DialogueOption;
use App\Models\LoreEntry;
use App\Models\Project;
use App\Services\Ai\AiUnavailableException;
use App\Services\Ai\GroqClient;
use App\Services\Branching\GraphInspector;
use App\Services\Emotion\ScenePrompt;
use Illuminate\Support\Str;

/**
 * "Revisar consecuencias" (HU 50): Groq lee el grafo (nodos, opciones, condiciones, efectos y variables)
 * con el contexto de la Biblia y señala posibles incompatibilidades entre decisiones, con evidencia
 * (option_id + explicación + gravedad). Las convergencias de ramas se presentan como revisión, no como error.
 *
 * Solo lee: registra la llamada en ai_generations (`consequence_review`) y nunca modifica el grafo.
 * Sin degradación (no hay equivalente por palabras clave): si la IA no responde, 503 amable.
 */
class ConsequenceReviewService
{
    public const SCHEMA_NAME = 'branching_consequence_review';

    public const KINDS = ['incompatibility', 'convergence', 'dead_condition', 'unused_effect'];

    public const SEVERITIES = ['low', 'medium', 'high'];

    /** Presupuesto del plan gratuito: como mucho estos nodos y palabras por nodo. */
    private const MAX_NODES = 40;

    private const NODE_WORDS = 45;

    private const MAX_FINDINGS = 12;

    public function __construct(
        private readonly GroqClient $groq,
        private readonly GraphInspector $inspector,
        private readonly ScenePrompt $prompt,
    ) {}

    /**
     * @return array{summary: string, findings: list<array>, truncated: bool, generation_id: int|null}
     *
     * @throws AiUnavailableException
     */
    public function review(Project $project, int $userId): array
    {
        $nodes = $project->dialogueNodes()->with(['character:id,name', 'loreEntries:id,title', 'options' => fn ($query) => $query->orderBy('id')])->orderBy('id')->get();
        $optionCount = $nodes->sum(fn (DialogueNode $node) => $node->options->count());

        abort_if($optionCount === 0, 422, __('There are no options to review yet: connect some nodes first.'));

        $inspection = $this->inspector->inspect($nodes);
        $truncated = $nodes->count() > self::MAX_NODES;
        $nodes = $nodes->take(self::MAX_NODES);
        $options = $nodes->flatMap(fn (DialogueNode $node) => $node->options)->keyBy('id');

        $response = $this->groq->chatJson(
            $this->system($project),
            $this->user($project, $nodes, $inspection['start_node_id'], $truncated),
            $this->schema(),
            self::SCHEMA_NAME,
            log: ['project_id' => $project->id, 'user_id' => $userId, 'type' => 'consequence_review'],
        );

        $findings = $this->validate($response->data, $options);

        if ($findings === null) {
            throw new AiUnavailableException('invalid_output', generationId: $response->generationId);
        }

        $titles = $nodes->mapWithKeys(fn (DialogueNode $node) => [$node->id => $node->displayTitle()]);

        return [
            'summary' => $findings['summary'],
            'findings' => array_map(fn (array $finding) => [
                ...$finding,
                // Evidencia navegable: la opción y el nodo donde está.
                'node_id' => $options[$finding['option_id']]->dialogue_node_id,
                'node_title' => $titles[$options[$finding['option_id']]->dialogue_node_id] ?? '',
                'option_label' => $options[$finding['option_id']]->player_option,
                // Una convergencia es una revisión, nunca un error.
                'review' => $finding['kind'] === 'convergence',
            ], $findings['findings']),
            'truncated' => $truncated,
            'generation_id' => $response->generationId,
        ];
    }

    private function system(Project $project): string
    {
        $interface = $this->prompt->language(app()->getLocale());

        return <<<PROMPT
        Eres un asistente de diseño narrativo para videojuegos. Revisas la COHERENCIA DE LAS DECISIONES
        de un diálogo ramificado: qué puede elegir el jugador, qué exige cada opción (condición) y qué
        cambia (efectos sobre variables). Solo señalas posibles problemas; nunca reescribes nada.

        Tipos de hallazgo ("kind"):
        - incompatibility: una opción o su consecuencia contradice decisiones anteriores del mismo
          camino, el estado de las variables o una regla de la Biblia.
        - convergence: caminos distintos vuelven al mismo nodo y una decisión pierde su peso. Es una
          revisión de diseño, no un error: muchas convergencias son intencionadas.
        - dead_condition: una condición que no se puede cumplir con los efectos que existen.
        - unused_effect: un efecto que ninguna condición llega a usar (solo si parece un descuido).

        Reglas:
        1. Cada hallazgo apunta a UNA opción con su option_id exacto de la lista. No inventes ids.
        2. "evidence": cita breve de la opción, la condición, el efecto o el nodo que lo demuestra.
        3. "severity": high solo si rompe la historia o hace imposible un camino; low si es menor.
        4. Como mucho 12 hallazgos, los más importantes. Si no hay problemas, lista vacía.
        5. Escribe "summary", "explanation" y "evidence" explicativa en {$interface}, con lenguaje claro.
        PROMPT;
    }

    private function user(Project $project, $nodes, ?int $startId, bool $truncated): string
    {
        $project->loadMissing('constraint');
        $lines = ["PROYECTO: {$project->title} · Género: ".($project->game_genre ?: '—').' · Idioma de la narrativa: '.$this->prompt->language($project->language ?: 'es')];

        $essence = array_filter([
            'Premisa' => $project->premise,
            'Conflicto principal' => $project->central_conflict,
            'Desenlace previsto' => $project->constraint?->expected_outcome,
        ], 'filled');
        if ($essence) {
            $lines[] = 'ESENCIA: '.implode(' / ', array_map(fn ($key, $value) => "$key: ".Str::limit($value, 300), array_keys($essence), $essence));
        }

        $rules = $project->loreEntries()->where('type', 'rule')->orderBy('title')->limit((int) config('gamerdust.ai.max_context_items', 8))->get();
        $lines[] = 'REGLAS DEL MUNDO:';
        foreach ($rules as $rule) {
            /** @var LoreEntry $rule */
            $lines[] = "- \"{$rule->title}\" ({$rule->rigidity}): ".Str::limit((string) ($rule->statement ?: $rule->description), 200);
        }
        if ($rules->isEmpty()) {
            $lines[] = '- ninguna';
        }

        $variables = $project->branchingVariables()->get();
        $lines[] = '';
        $lines[] = 'VARIABLES: '.($variables->isEmpty() ? 'ninguna' : $variables->map(fn ($variable) => "{$variable->key} ({$variable->type}, empieza en ".json_encode($variable->initial_value).')'.($variable->description ? " — {$variable->description}" : ''))->implode('; '));

        $lines[] = '';
        $lines[] = 'NODOS'.($truncated ? ' (solo los primeros '.self::MAX_NODES.')' : '').':';
        foreach ($nodes as $node) {
            $flags = array_filter([$node->id === $startId ? 'INICIO' : null, $node->is_ending ? 'FINAL' : null]);
            $lines[] = "[node:{$node->id}] \"{$node->displayTitle()}\"".($flags ? ' ('.implode(', ', $flags).')' : '')
                .($node->character ? " · habla {$node->character->name}" : '')
                .($node->loreEntries->isNotEmpty() ? ' · Biblia: '.$node->loreEntries->pluck('title')->implode(', ') : '')
                .': '.Str::words(trim((string) preg_replace('/\{\{\s*([^{}\r\n]+?)\s*\}\}/u', '$1', (string) $node->text)), self::NODE_WORDS, '…');

            foreach ($node->options as $option) {
                /** @var DialogueOption $option */
                $parts = ["  - [option:{$option->id}] \"{$option->player_option}\" → ".($option->next_dialogue_node_id ? "node:{$option->next_dialogue_node_id}" : 'sin destino')];
                if ($option->condition) {
                    $parts[] = 'requiere '.$option->condition['var'].' '.$option->condition['op'].' '.json_encode($option->condition['value']);
                }
                if ($option->effects) {
                    $parts[] = 'efectos: '.implode(', ', array_map(fn (array $effect) => "{$effect['var']} {$effect['op']} ".json_encode($effect['value']), $option->effects));
                }
                if (filled($option->consequence)) {
                    $parts[] = 'nota del autor: '.Str::limit($option->consequence, 120);
                }
                $lines[] = implode(' · ', $parts);
            }
        }

        return implode("\n", $lines);
    }

    public function schema(): array
    {
        $string = ['type' => 'string'];

        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['summary', 'findings'],
            'properties' => [
                'summary' => $string,
                'findings' => ['type' => 'array', 'items' => [
                    'type' => 'object',
                    'additionalProperties' => false,
                    'required' => ['kind', 'option_id', 'explanation', 'evidence', 'severity'],
                    'properties' => [
                        'kind' => ['type' => 'string', 'enum' => self::KINDS],
                        'option_id' => ['type' => 'integer'],
                        'explanation' => $string,
                        'evidence' => $string,
                        'severity' => ['type' => 'string', 'enum' => self::SEVERITIES],
                    ],
                ]],
            ],
        ];
    }

    /**
     * Validación en PHP: solo opciones del proyecto que se enviaron, tipos y gravedades de la lista,
     * textos recortados. Devuelve null si falta la lista de hallazgos.
     */
    public function validate(array $data, $options): ?array
    {
        if (! is_array($data['findings'] ?? null)) {
            return null;
        }

        $text = fn (mixed $value, int $limit = 600) => is_string($value) ? Str::limit(trim($value), $limit, '…') : '';
        $findings = [];

        foreach (array_filter($data['findings'], 'is_array') as $item) {
            $id = filter_var($item['option_id'] ?? null, FILTER_VALIDATE_INT);
            $explanation = $text($item['explanation'] ?? null);

            if ($id === false || ! $options->has($id) || $explanation === '') {
                continue;
            }

            $findings[] = [
                'kind' => in_array($item['kind'] ?? null, self::KINDS, true) ? $item['kind'] : 'incompatibility',
                'option_id' => $id,
                'explanation' => $explanation,
                'evidence' => $text($item['evidence'] ?? null, 240),
                'severity' => in_array($item['severity'] ?? null, self::SEVERITIES, true) ? $item['severity'] : 'medium',
            ];
        }

        return ['summary' => $text($data['summary'] ?? null), 'findings' => array_slice($findings, 0, self::MAX_FINDINGS)];
    }
}
