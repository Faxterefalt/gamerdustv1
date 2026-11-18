<?php

namespace App\Services\Emotion;

use App\Contracts\EmotionAnalyzer;
use App\Models\AiFeedback;
use App\Models\Character;
use App\Models\DialogueNode;
use App\Models\EmotionalAnalysis;
use App\Models\LoreEntry;
use App\Services\Ai\AiUnavailableException;
use App\Services\Ai\GroqClient;
use App\Services\Script\ScenePlainText;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Análisis emocional de un nodo de diálogo (HU 45): mismo modelo que el de escena (Groq con esquema
 * strict y validación en PHP, o palabras clave sin clave), con degradación a palabras clave si Groq
 * falla. Se guarda en emotional_analyses (polimórfica, analyzable = DialogueNode) y nunca toca el nodo.
 *
 * Contexto: esencia del proyecto, hablante (character_id) con sus reglas, escena, entradas de la Biblia
 * vinculadas (dialogue_node_lore_entry), nodos que llevan a este y sus opciones de salida.
 */
class NodeEmotionService
{
    public const SCHEMA_NAME = 'dialogue_node_emotion_analysis';

    private const PREVIOUS_NODES = 3;

    private const PREVIOUS_WORDS = 60;

    public function __construct(
        private readonly EmotionAnalyzer $analyzer,
        private readonly GroqClient $groq,
        private readonly ScenePrompt $prompt,
        private readonly SceneResultValidator $validator,
        private readonly EmotionTranslator $translator,
        private readonly EmotionalAnalysisService $keywords,
        private readonly ScenePlainText $words,
    ) {}

    /**
     * @param  bool  $force  "Reanalizar": ignora la caché
     */
    public function analyze(DialogueNode $node, int $userId, bool $force = false): array
    {
        $text = $this->plainText($node);
        abort_if($text === '', 422, __('There is not enough text to analyze.'));

        $context = $this->context($node);
        $hash = $this->hash($text, $context);

        if (! $force && ($cached = $this->cached($node, $hash))) {
            return $this->present($cached, fromCache: true, stale: false);
        }

        $result = $this->analyzer->source() === 'groq'
            ? $this->withGroq($node, $context, $text, $userId)
            : $this->withKeywords($text);

        [$input] = $this->words->limit($text, (int) config('gamerdust.ai.max_scene_words', 1800));
        $data = $result->toArray();
        $data['inconsistencies'] = array_map(fn (array $item) => [...$item, 'entry' => $this->matchEntry($item['contradicts'], $context)], $data['inconsistencies']);

        $analysis = $node->project->emotionalAnalyses()->create([
            'analyzable_type' => DialogueNode::class,
            'analyzable_id' => $node->id,
            'input_text' => $input,
            'dominant_emotion' => $result->scene['emotion'],
            'valence' => $result->scene['v'],
            'arousal' => $result->scene['a'],
            'dominance' => $result->scene['d'],
            'interpretation' => $result->scene['summary'],
            'suggestions' => array_column($result->suggestions, 'text'),
            'source' => $result->source,
            'model' => $result->model,
            'content_hash' => $hash,
            'result' => $data,
            'truncated' => false,
            'degraded' => $result->degraded,
        ]);

        return $this->present($analysis, fromCache: false, stale: false);
    }

    /** Último análisis del nodo (sin llamar a la IA), con aviso si el texto o el contexto cambiaron. */
    public function latest(DialogueNode $node): ?array
    {
        $analysis = $this->query($node)->first();

        if (! $analysis) {
            return null;
        }

        $text = $this->plainText($node);

        return $this->present($analysis, fromCache: true, stale: $text === '' || $analysis->content_hash !== $this->hash($text, $this->context($node)));
    }

    private function withGroq(DialogueNode $node, array $context, string $text, int $userId): SceneEmotionResult
    {
        try {
            $response = $this->groq->chatJson(
                $this->system($context),
                $this->user($context),
                $this->prompt->schema(),
                self::SCHEMA_NAME,
                log: ['project_id' => $node->project_id, 'user_id' => $userId, 'type' => 'node_analysis'],
            );
        } catch (AiUnavailableException $exception) {
            $this->groq->markDegraded($exception->generationId);

            return $this->withKeywords($text)->asDegraded($exception->generationId);
        }

        $data = $this->validator->validate($response->data, array_column($context['characters'], 'id'));

        if ($data === null) {
            $this->groq->markDegraded($response->generationId);

            return $this->withKeywords($text)->asDegraded($response->generationId);
        }

        return new SceneEmotionResult(
            scene: $data['scene'],
            characters: $data['characters'],
            inconsistencies: $data['inconsistencies'],
            suggestions: $data['suggestions'],
            source: 'groq',
            model: $response->model,
            aiGenerationId: $response->generationId,
        );
    }

    private function withKeywords(string $text): SceneEmotionResult
    {
        return KeywordEmotionAnalyzer::fromKeywords($this->keywords->analyze($text));
    }

    /** Texto del nodo con las referencias {{Título}} como texto plano. */
    private function plainText(DialogueNode $node): string
    {
        return trim((string) preg_replace('/\{\{\s*([^{}\r\n]+?)\s*\}\}/u', '$1', (string) $node->text));
    }

    /**
     * Contexto con la misma forma que el de escena (ScenePrompt::contextLines) más los datos del nodo.
     */
    private function context(DialogueNode $node): array
    {
        $node->loadMissing(['project.constraint', 'scene', 'character.loreEntries', 'loreEntries', 'options.nextDialogueNode:id,node_key,title', 'incomingOptions.dialogueNode']);
        $project = $node->project;
        $limit = (int) config('gamerdust.ai.max_context_items', 8);
        $linked = $node->loreEntries;
        $location = $linked->firstWhere('type', 'location') ?? $node->scene?->location;
        $rules = $linked->where('type', 'rule')
            ->concat($location ? $location->linkedEntries()->where('type', 'rule')->get() : [])
            ->concat($node->character ? $node->character->loreEntries->where('type', 'rule') : [])
            ->unique('id')
            ->take($limit)
            ->values();

        return [
            'project' => [
                'title' => $project->title,
                'genre' => $project->game_genre,
                'language' => $project->language ?: 'es',
                'essence' => array_filter([
                    'premise' => $project->premise,
                    'central_conflict' => $project->central_conflict,
                    'central_theme' => $project->constraint?->central_theme,
                    'tone' => $project->constraint?->main_emotional_tone,
                    'setting' => $project->constraint?->setting,
                    'assignment' => $project->constraint?->assignment,
                ], 'filled'),
            ],
            'location' => $location ? ['id' => $location->id, 'title' => $location->title, 'description' => $this->clip($location->description)] : null,
            'rules' => $rules->map(fn (LoreEntry $rule) => [
                'id' => $rule->id,
                'title' => $rule->title,
                'rigidity' => $rule->rigidity,
                'statement' => $this->clip($rule->statement ?: $rule->description),
            ])->all(),
            'characters' => $node->character ? [$this->character($node->character)] : [],
            'lore' => $linked->whereNotIn('type', ['location', 'rule'])->take($limit)->map(fn (LoreEntry $entry) => [
                'title' => $entry->title,
                'description' => $this->clip($entry->description),
            ])->values()->all(),
            'node' => [
                'id' => $node->id,
                'title' => $node->displayTitle(),
                'text' => $this->words->limit($this->plainText($node), (int) config('gamerdust.ai.max_scene_words', 1800))[0],
                'dialogue_type' => $node->dialogue_type,
                'intended_tone' => $node->emotional_tone,
                'scene' => $node->scene ? array_filter([
                    'title' => $node->scene->title,
                    'summary' => $this->clip($node->scene->summary),
                    'conflict' => $this->clip($node->scene->conflict),
                ], 'filled') : null,
            ],
            'previous' => $node->incomingOptions
                ->filter(fn ($option) => $option->dialogueNode && $option->dialogue_node_id !== $node->id)
                ->unique('dialogue_node_id')
                ->take(self::PREVIOUS_NODES)
                ->map(fn ($option) => [
                    'title' => $option->dialogueNode->displayTitle(),
                    'choice' => $option->player_option,
                    'text' => Str::words($this->plainText($option->dialogueNode), self::PREVIOUS_WORDS, '…'),
                ])->values()->all(),
            'options' => $node->options->map(fn ($option) => [
                'label' => $option->player_option,
                'target' => $option->nextDialogueNode?->displayTitle(),
            ])->all(),
        ];
    }

    private function character(Character $character): array
    {
        return [
            'id' => $character->id,
            'name' => $character->name,
            'role' => $character->role,
            'description' => $this->clip($character->background),
            'personality' => $this->clip($character->personality),
            'motivation' => $this->clip($character->motivation),
            'values' => $this->clip($character->values),
            'inner_conflict' => $this->clip($character->inner_conflict),
            'fear' => $this->clip($character->fear),
            'limits' => $this->clip($character->limits),
            'rules' => $character->loreEntries
                ->where('type', 'rule')
                ->map(fn (LoreEntry $rule) => ['id' => $rule->id, 'title' => $rule->title, 'role' => $rule->pivot->role])
                ->values()->all(),
        ];
    }

    private function system(array $context): string
    {
        $emotions = implode(', ', $this->translator->keys());
        $narrative = $this->prompt->language($context['project']['language']);
        $interface = $this->prompt->language(app()->getLocale());

        return <<<PROMPT
        Eres un asistente de diseño narrativo para videojuegos. Analizas UN NODO de un diálogo
        ramificado (un pasaje que el jugador lee o escucha). Tu trabajo es LEER y EVALUAR; nunca
        reescribes el nodo ni decides por el autor.

        Dimensiones (0 a 1): v (valencia: 0 negativo · 1 positivo), a (activación: 0 calma · 1 máxima
        tensión), d (dominancia: 0 a merced · 1 domina la situación).
        "emotion" debe ser exactamente una de: {$emotions}.

        Reglas:
        1. En "scene" describe el NODO: valores, emoción, "summary" (qué transmite) y "evidence"
           (cita breve y LITERAL del nodo, máx. 15 palabras, en {$narrative}).
        2. En "characters" incluye solo al HABLANTE de la lista PERSONAJES (con su character_id exacto);
           si no hay hablante, lista vacía. "out_of_character" = true solo si el texto contradice
           claramente su ficha, con la razón.
        3. En el nodo y en el hablante, "change_justified" = true si el tono es coherente con los
           NODOS PREVIOS y la opción elegida para llegar (o si no hay nodos previos);
           "change_explanation" lo resume.
        4. "inconsistencies": solo contradicciones reales con el LUGAR, las REGLAS DEL MUNDO
           (ten en cuenta su rigidez), el LORE vinculado o la esencia. En "contradicts" escribe el
           nombre exacto de la ficha. Si no hay, lista vacía.
        5. Si el autor indicó un TONO BUSCADO, di en "summary" si el texto lo consigue.
        6. "suggestions": de 1 a 3, concretas y descartables. Nunca devuelvas el nodo reescrito.
        7. Escribe "summary", explicaciones y sugerencias en {$interface}, sin mencionar valencia,
           activación, dominancia ni VAD.
        PROMPT;
    }

    private function user(array $context): string
    {
        $lines = $this->prompt->contextLines($context);
        $node = $context['node'];

        if ($context['lore']) {
            $lines[] = '';
            $lines[] = 'LORE VINCULADO:';
            foreach ($context['lore'] as $entry) {
                $lines[] = "- \"{$entry['title']}\"".($entry['description'] ? ": {$entry['description']}" : '');
            }
        }

        $lines[] = '';
        $lines[] = 'NODOS PREVIOS:';
        foreach ($context['previous'] as $previous) {
            $lines[] = "- \"{$previous['title']}\" (el jugador eligió: \"{$previous['choice']}\"): {$previous['text']}";
        }
        if (! $context['previous']) {
            $lines[] = '- ninguno (puede ser el inicio)';
        }

        if ($node['scene']) {
            $lines[] = '';
            $lines[] = 'ESCENA: '.implode(' / ', array_map(fn ($key, $value) => match ($key) {
                'title' => "\"{$value}\"",
                'summary' => "Resumen: {$value}",
                default => "Conflicto: {$value}",
            }, array_keys($node['scene']), $node['scene']));
        }

        $lines[] = '';
        $lines[] = "NODO \"{$node['title']}\" · tipo: {$node['dialogue_type']}".($node['intended_tone'] ? " · TONO BUSCADO por el autor: {$node['intended_tone']}" : '');
        $lines[] = $node['text'];

        if ($context['options']) {
            $lines[] = '';
            $lines[] = 'OPCIONES DE SALIDA: '.implode(' | ', array_map(fn (array $option) => $option['label'].($option['target'] ? " → {$option['target']}" : ''), $context['options']));
        }

        return implode("\n", $lines);
    }

    private function hash(string $text, array $context): string
    {
        return hash('sha256', json_encode([$text, $context, app()->getLocale(), $this->analyzer->source()]));
    }

    private function cached(DialogueNode $node, string $hash): ?EmotionalAnalysis
    {
        // Un análisis degradado no se reutiliza: pulsar de nuevo vuelve a intentar con la IA.
        return $this->query($node)->where('content_hash', $hash)->where('degraded', false)->first();
    }

    private function query(DialogueNode $node)
    {
        // Solo los análisis con hash (los antiguos por palabras clave usan otra escala).
        return $node->emotionalAnalyses()->reorder()->whereNotNull('content_hash')->latest('id');
    }

    public function present(EmotionalAnalysis $analysis, bool $fromCache, bool $stale): array
    {
        $result = $analysis->result ?? [];
        $node = $result['scene'] ?? [];
        $projectId = $analysis->project_id;
        $speaker = $result['characters'][0] ?? null;

        return [
            'id' => $analysis->id,
            'created_at' => $analysis->created_at?->toJSON(),
            'from_cache' => $fromCache,
            'stale' => $stale,
            'source' => $analysis->source,
            'model' => $analysis->model,
            'degraded' => $analysis->degraded,
            ...$this->emotionPayload($node),
            'summary' => $node['summary'] ?? '',
            'evidence' => $node['evidence'] ?? '',
            'flow' => ['justified' => $node['change_justified'] ?? null, 'explanation' => $node['change_explanation'] ?? ''],
            'speaker' => $speaker ? [
                'character_id' => $speaker['character_id'],
                'name' => Character::whereKey($speaker['character_id'])->value('name') ?? $speaker['name'],
                ...$this->emotionPayload($speaker),
                'evidence' => $speaker['evidence'],
                'out_of_character' => $speaker['out_of_character'],
                'out_of_character_reason' => $speaker['out_of_character_reason'],
            ] : null,
            'inconsistencies' => array_map(fn (array $item) => [
                'fragment' => $item['fragment'],
                'contradicts' => $item['contradicts'],
                'explanation' => $item['explanation'],
                'severity' => $item['severity'],
                'url' => match ($item['entry']['type'] ?? null) {
                    'location' => "/projects/{$projectId}/bible/locations?entry={$item['entry']['id']}",
                    'rule' => "/projects/{$projectId}/bible/rules?entry={$item['entry']['id']}",
                    'character' => "/projects/{$projectId}/characters?character={$item['entry']['id']}",
                    default => null,
                },
            ], $result['inconsistencies'] ?? []),
            'suggestions' => $result['suggestions'] ?? [],
            'feedback' => (object) AiFeedback::query()
                ->where('emotional_analysis_id', $analysis->id)
                ->where('user_id', auth()->id())
                ->pluck('useful', 'item_index')
                ->all(),
        ];
    }

    private function emotionPayload(array $state): array
    {
        $vad = ['v' => (float) ($state['v'] ?? 0.5), 'a' => (float) ($state['a'] ?? 0.5), 'd' => (float) ($state['d'] ?? 0.5)];

        return [
            'emotion' => $state['emotion'] ?? 'neutral',
            'labels' => array_map(fn (string $key) => __($key), $this->translator->labels(...$vad)),
            'vad' => $vad,
        ];
    }

    /** @return array{type: string, id: int}|null */
    private function matchEntry(string $contradicts, array $context): ?array
    {
        $needle = Str::lower(trim($contradicts, " \"'«»"));

        if ($needle === '') {
            return null;
        }

        /** @var Collection<int, array{type: string, id: int, name: string}> $candidates */
        $candidates = collect([
            ...($context['location'] ? [['type' => 'location', 'id' => $context['location']['id'], 'name' => $context['location']['title']]] : []),
            ...array_map(fn (array $rule) => ['type' => 'rule', 'id' => $rule['id'], 'name' => $rule['title']], $context['rules']),
            ...array_map(fn (array $character) => ['type' => 'character', 'id' => $character['id'], 'name' => $character['name']], $context['characters']),
        ]);

        $match = $candidates->first(function (array $candidate) use ($needle) {
            $name = Str::lower($candidate['name']);

            return $name !== '' && (Str::contains($needle, $name) || Str::contains($name, $needle));
        });

        return $match ? ['type' => $match['type'], 'id' => $match['id']] : null;
    }

    private function clip(?string $value, int $limit = 300): ?string
    {
        return filled($value) ? Str::limit(trim($value), $limit) : null;
    }
}
