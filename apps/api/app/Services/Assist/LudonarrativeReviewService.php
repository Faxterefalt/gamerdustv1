<?php

namespace App\Services\Assist;

use App\Models\Character;
use App\Models\LoreEntry;
use App\Models\Mechanic;
use App\Models\Project;
use App\Models\Scene;
use App\Services\Ai\AiUnavailableException;
use App\Services\Ai\GroqClient;
use App\Services\Emotion\ScenePrompt;
use App\Services\Script\ScenePlainText;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * "Detectar disonancias" (HU 56): Groq contrasta cada mecánica con las escenas y personajes vinculados
 * y con las reglas del mundo que les afectan (las del lugar de cada escena y las de cada personaje), y
 * devuelve conflictos ludonarrativos con evidencia. Una mecánica sin vínculos no se envía: su resultado
 * es "contexto insuficiente". Si ninguna tiene vínculos, no se llama a la IA.
 *
 * Solo lee: registra la llamada en ai_generations (`ludonarrative_review`) y nunca modifica nada.
 */
class LudonarrativeReviewService
{
    public const SCHEMA_NAME = 'ludonarrative_dissonance_review';

    public const ELEMENTS = ['scene', 'character', 'rule'];

    public const SEVERITIES = ['low', 'medium', 'high'];

    private const MAX_MECHANICS = 10;

    private const SCENES_PER_MECHANIC = 3;

    private const SCENE_WORDS = 90;

    private const MAX_FINDINGS = 15;

    public function __construct(
        private readonly GroqClient $groq,
        private readonly ScenePrompt $prompt,
        private readonly ScenePlainText $text,
    ) {}

    /**
     * @return array{summary: string, findings: list<array>, insufficient: list<array{id: int, title: string}>, reviewed: list<int>, generation_id: int|null}
     *
     * @throws AiUnavailableException
     */
    public function review(Project $project, int $userId): array
    {
        $mechanics = $project->mechanics()
            ->with(['scenes.location', 'scenes.characters:id', 'characters.loreEntries'])
            ->orderBy('id')
            ->get();

        abort_if($mechanics->isEmpty(), 422, __('There are no mechanics to review yet.'));

        [$linked, $unlinked] = $mechanics->partition(fn (Mechanic $mechanic) => $mechanic->scenes->isNotEmpty() || $mechanic->characters->isNotEmpty());
        $linked = $linked->take(self::MAX_MECHANICS)->values();
        $insufficient = $unlinked->map(fn (Mechanic $mechanic) => ['id' => $mechanic->id, 'title' => $mechanic->title])->values()->all();

        if ($linked->isEmpty()) {
            return ['summary' => __('Insufficient context: link scenes or characters to your mechanics to compare them with the story.'), 'findings' => [], 'insufficient' => $insufficient, 'reviewed' => [], 'generation_id' => null];
        }

        $contexts = $linked->mapWithKeys(fn (Mechanic $mechanic) => [$mechanic->id => $this->context($mechanic)]);

        $response = $this->groq->chatJson(
            $this->system(),
            $this->user($project, $linked, $contexts),
            $this->schema(),
            self::SCHEMA_NAME,
            log: ['project_id' => $project->id, 'user_id' => $userId, 'type' => 'ludonarrative_review'],
        );

        $result = $this->validate($response->data, $contexts);

        if ($result === null) {
            throw new AiUnavailableException('invalid_output', generationId: $response->generationId);
        }

        $titles = $linked->pluck('title', 'id');

        return [
            'summary' => $result['summary'],
            'findings' => array_map(fn (array $finding) => [
                ...$finding,
                'mechanic_title' => $titles[$finding['mechanic_id']] ?? '',
                'element' => $finding['element'] ? [...$finding['element'], 'url' => $this->url($project->id, $finding['element'])] : null,
            ], $result['findings']),
            'insufficient' => $insufficient,
            'reviewed' => $linked->pluck('id')->all(),
            'generation_id' => $response->generationId,
        ];
    }

    /**
     * Elementos con los que se contrasta una mecánica: escenas vinculadas, personajes vinculados
     * (y los de esas escenas) y reglas del lugar de cada escena y de cada personaje.
     *
     * @return array{scenes: Collection<int, Scene>, characters: Collection<int, Character>, rules: Collection<int, LoreEntry>}
     */
    private function context(Mechanic $mechanic): array
    {
        $scenes = $mechanic->scenes->take(self::SCENES_PER_MECHANIC);
        $characters = $mechanic->characters;
        $rules = $scenes
            ->flatMap(fn (Scene $scene) => $scene->location ? $scene->location->linkedEntries()->where('type', 'rule')->get() : [])
            ->concat($characters->flatMap(fn (Character $character) => $character->loreEntries->where('type', 'rule')))
            ->unique('id')
            ->take((int) config('gamerdust.ai.max_context_items', 8))
            ->values();

        return ['scenes' => $scenes, 'characters' => $characters, 'rules' => $rules];
    }

    private function system(): string
    {
        $interface = $this->prompt->language(app()->getLocale());

        return <<<PROMPT
        Eres un asistente de diseño narrativo para videojuegos. Buscas DISONANCIAS LUDONARRATIVAS:
        casos en que lo que una mecánica permite o premia al jugador contradice lo que la historia dice
        de los personajes, de las escenas o de las reglas del mundo (p. ej. un personaje pacifista cuya
        mecánica central es matar, o una regla inquebrantable que la mecánica deja romper sin coste).
        Solo señalas posibles conflictos; nunca reescribes nada ni decides por el autor.

        Reglas:
        1. Cada hallazgo apunta a una mecánica con su mechanic_id exacto y al elemento concreto con
           el que choca: element_type (scene | character | rule) y element_id exacto de los listados
           bajo ESA mecánica. No inventes ids.
        2. "evidence": cita breve de la mecánica o del elemento que muestra el choque.
        3. "severity": high si el jugador lo notará y rompe la experiencia; low si es un matiz.
        4. Si una mecánica es coherente con su contexto, no la menciones. Como mucho 15 hallazgos.
        5. Escribe "summary", "conflict" y "evidence" explicativa en {$interface}, con lenguaje claro.
        PROMPT;
    }

    private function user(Project $project, Collection $mechanics, Collection $contexts): string
    {
        $lines = ["PROYECTO: {$project->title} · Género: ".($project->game_genre ?: '—').' · Idioma de la narrativa: '.$this->prompt->language($project->language ?: 'es')];

        if (filled($project->premise)) {
            $lines[] = 'PREMISA: '.Str::limit($project->premise, 300);
        }

        foreach ($mechanics as $mechanic) {
            /** @var Mechanic $mechanic */
            $context = $contexts[$mechanic->id];
            $lines[] = '';
            $lines[] = "MECÁNICA [mechanic:{$mechanic->id}] \"{$mechanic->title}\"".($mechanic->kind ? " ({$mechanic->kind})" : '');

            foreach ([
                'Descripción' => $mechanic->description,
                'Activación' => $mechanic->activation,
                'Efecto narrativo' => $mechanic->narrative_effect,
                'Acciones del jugador' => $mechanic->playable_actions,
                'Restricciones' => $mechanic->restrictions,
                'Conflicto declarado' => $mechanic->conflict,
            ] as $label => $value) {
                if (filled($value)) {
                    $lines[] = "  {$label}: ".Str::limit(preg_replace('/\s+/u', ' ', $value), 300);
                }
            }

            foreach ($context['scenes'] as $scene) {
                [$text] = $this->text->limit($this->text->build($scene), self::SCENE_WORDS);
                $lines[] = "  - [scene:{$scene->id}] \"{$scene->title}\"".(filled($scene->conflict) ? ' · conflicto: '.Str::limit($scene->conflict, 160) : '').': '.(preg_replace('/\s+/u', ' ', $text) ?: Str::limit((string) $scene->summary, 300));
            }

            foreach ($context['characters'] as $character) {
                $traits = array_filter([
                    'personalidad' => $character->personality,
                    'motivación' => $character->motivation,
                    'valores' => $character->values,
                    'límites' => $character->limits,
                ], 'filled');
                $lines[] = "  - [character:{$character->id}] {$character->name}".($traits ? ': '.implode(' | ', array_map(fn ($key, $value) => "$key: ".Str::limit($value, 160), array_keys($traits), $traits)) : '');
            }

            foreach ($context['rules'] as $rule) {
                $lines[] = "  - [rule:{$rule->id}] \"{$rule->title}\" ({$rule->rigidity}): ".Str::limit((string) ($rule->statement ?: $rule->description), 200);
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
                    'required' => ['mechanic_id', 'element_type', 'element_id', 'conflict', 'evidence', 'severity'],
                    'properties' => [
                        'mechanic_id' => ['type' => 'integer'],
                        'element_type' => ['type' => 'string', 'enum' => self::ELEMENTS],
                        'element_id' => ['type' => 'integer'],
                        'conflict' => $string,
                        'evidence' => $string,
                        'severity' => ['type' => 'string', 'enum' => self::SEVERITIES],
                    ],
                ]],
            ],
        ];
    }

    /**
     * Validación en PHP: la mecánica debe ser una de las enviadas; el elemento, uno de su contexto
     * (si no, el hallazgo se conserva sin elemento). Gravedad de la lista y textos recortados.
     */
    public function validate(array $data, Collection $contexts): ?array
    {
        if (! is_array($data['findings'] ?? null)) {
            return null;
        }

        $text = fn (mixed $value, int $limit = 600) => is_string($value) ? Str::limit(trim($value), $limit, '…') : '';
        $findings = [];

        foreach (array_filter($data['findings'], 'is_array') as $item) {
            $mechanicId = filter_var($item['mechanic_id'] ?? null, FILTER_VALIDATE_INT);
            $conflict = $text($item['conflict'] ?? null);

            if ($mechanicId === false || ! $contexts->has($mechanicId) || $conflict === '') {
                continue;
            }

            $type = $item['element_type'] ?? null;
            $elementId = filter_var($item['element_id'] ?? null, FILTER_VALIDATE_INT);
            $pool = match ($type) {
                'scene' => $contexts[$mechanicId]['scenes'],
                'character' => $contexts[$mechanicId]['characters'],
                'rule' => $contexts[$mechanicId]['rules'],
                default => collect(),
            };
            $element = $elementId !== false ? $pool->firstWhere('id', $elementId) : null;

            $findings[] = [
                'mechanic_id' => $mechanicId,
                'element' => $element ? ['type' => $type, 'id' => $element->id, 'label' => $element->title ?? $element->name] : null,
                'conflict' => $conflict,
                'evidence' => $text($item['evidence'] ?? null, 240),
                'severity' => in_array($item['severity'] ?? null, self::SEVERITIES, true) ? $item['severity'] : 'medium',
            ];
        }

        return ['summary' => $text($data['summary'] ?? null), 'findings' => array_slice($findings, 0, self::MAX_FINDINGS)];
    }

    private function url(int $projectId, array $element): string
    {
        return match ($element['type']) {
            'scene' => "/projects/{$projectId}/script?scene={$element['id']}",
            'character' => "/projects/{$projectId}/characters?character={$element['id']}",
            default => "/projects/{$projectId}/bible/rules?entry={$element['id']}",
        };
    }
}
