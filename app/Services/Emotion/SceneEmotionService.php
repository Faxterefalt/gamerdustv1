<?php

namespace App\Services\Emotion;

use App\Contracts\EmotionAnalyzer;
use App\Models\AiFeedback;
use App\Models\CharacterEmotionalState;
use App\Models\EmotionalAnalysis;
use App\Models\Scene;
use App\Services\Script\ScenePlainText;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Análisis emocional de escena de principio a fin:
 * caché por hash → analizador (Groq o palabras clave) → regla de cambio abrupto → guardado
 * en emotional_analyses + character_emotional_states → respuesta en lenguaje narrativo.
 *
 * Se invoca solo cuando el usuario pulsa "Analizar emociones" y siempre sobre la versión guardada.
 * Nunca modifica el guion.
 */
class SceneEmotionService
{
    public function __construct(
        private readonly EmotionAnalyzer $analyzer,
        private readonly SceneContextBuilder $contexts,
        private readonly EmotionChangeDetector $detector,
        private readonly EmotionTranslator $translator,
        private readonly ScenePlainText $text,
    ) {}

    /**
     * @param  bool  $force  "Reanalizar": ignora la caché
     */
    public function analyze(Scene $scene, bool $force = false): array
    {
        $text = $this->text->build($scene);
        abort_if($text === '', 422, __('There is not enough text to analyze.'));

        $hash = $this->contexts->contentHash($scene);

        if (! $force && ($cached = $this->cached($scene, $hash))) {
            return $this->present($cached, fromCache: true, stale: false);
        }

        // El contexto (estado previo, escena anterior) se lee antes de sustituir las filas de esta escena.
        $context = $this->contexts->build($scene);
        $result = $this->analyzer->analyzeScene($scene);

        $analysis = DB::transaction(fn () => $this->store($scene, $result, $context, $hash, $text));

        return $this->present($analysis, fromCache: false, stale: false);
    }

    /**
     * Último análisis de la escena (sin llamar a la IA), con aviso si el texto o el contexto cambiaron.
     */
    public function latest(Scene $scene): ?array
    {
        $analysis = $this->latestQuery($scene)->first();

        return $analysis
            ? $this->present($analysis, fromCache: true, stale: $analysis->content_hash !== $this->contexts->contentHash($scene))
            : null;
    }

    private function cached(Scene $scene, string $hash): ?EmotionalAnalysis
    {
        // Un análisis degradado no se reutiliza: pulsar de nuevo vuelve a intentar con la IA.
        return $this->latestQuery($scene)
            ->where('content_hash', $hash)
            ->where('source', $this->analyzer->source())
            ->where('degraded', false)
            ->first();
    }

    private function latestQuery(Scene $scene)
    {
        return $scene->emotionalAnalyses()->reorder()->whereNotNull('content_hash')->latest('id');
    }

    private function store(Scene $scene, SceneEmotionResult $result, array $context, string $hash, string $text): EmotionalAnalysis
    {
        $data = $result->toArray();
        $sceneState = $result->scene;

        // Salto de tono frente a la escena anterior analizada.
        $previousScene = $context['previous_scene'];
        $sceneChange = $this->detector->compare($previousScene ? $this->vad($previousScene) : null, $this->vad($sceneState), $sceneState['change_justified'] ?? null);
        $data['scene']['change'] = [
            ...$sceneChange,
            'justified' => $sceneState['change_justified'] ?? null,
            'explanation' => $sceneState['change_explanation'] ?? '',
            'previous' => $previousScene ? ['scene_id' => $previousScene['scene_id'], 'emotion' => $previousScene['emotion']] : null,
        ];

        // Cambio de cada personaje frente a su estado previo (IA anterior, autor o ninguno).
        foreach ($data['characters'] as $index => $character) {
            $previous = $context['previous'][$character['character_id']] ?? ['origin' => 'none'];
            $change = $this->detector->compare($previous['origin'] === 'none' ? null : $this->vad($previous), $this->vad($character), $character['change_justified']);

            $data['characters'][$index]['change'] = [
                ...$change,
                'justified' => $character['change_justified'],
                'explanation' => $character['change_explanation'],
                'previous' => [
                    'origin' => $previous['origin'],
                    'emotion' => $previous['emotion'] ?? null,
                    'scene_id' => $previous['scene_id'] ?? null,
                ],
            ];
        }

        $data['inconsistencies'] = array_map(fn (array $item) => [...$item, 'entry' => $this->matchEntry($item['contradicts'], $context)], $data['inconsistencies']);

        [$input] = $this->text->limit($text, (int) config('gamerdust.ai.max_scene_words', 1800));

        $analysis = $scene->project->emotionalAnalyses()->create([
            'analyzable_type' => Scene::class,
            'analyzable_id' => $scene->id,
            'input_text' => $input,
            'dominant_emotion' => $sceneState['emotion'],
            'valence' => $sceneState['v'],
            'arousal' => $sceneState['a'],
            'dominance' => $sceneState['d'],
            'interpretation' => $sceneState['summary'],
            'suggestions' => array_column($result->suggestions, 'text'),
            'source' => $result->source,
            'model' => $result->model,
            'content_hash' => $hash,
            'result' => $data,
            'truncated' => $result->truncated,
            'degraded' => $result->degraded,
            'scene_version_id' => $scene->versions()->value('id'),
        ]);

        // Al reanalizar una escena se sustituyen sus estados por personaje.
        CharacterEmotionalState::where('scene_id', $scene->id)->delete();

        foreach ($data['characters'] as $character) {
            CharacterEmotionalState::create([
                'project_id' => $scene->project_id,
                'character_id' => $character['character_id'],
                'scene_id' => $scene->id,
                'emotional_analysis_id' => $analysis->id,
                ...$this->vad($character),
                'emotion' => $character['emotion'],
                'evidence' => $character['evidence'],
                'abrupt_change' => $character['change']['abrupt'],
                'change_justified' => $character['change_justified'],
                'change_explanation' => $character['change_explanation'] ?: null,
                'out_of_character' => $character['out_of_character'],
                'out_of_character_reason' => $character['out_of_character_reason'] ?: null,
            ]);
        }

        return $analysis;
    }

    /**
     * Respuesta para el panel: etiquetas narrativas traducidas; v/a/d crudos solo para el modo técnico.
     */
    public function present(EmotionalAnalysis $analysis, bool $fromCache, bool $stale): array
    {
        $result = $analysis->result ?? [];
        $scene = $result['scene'] ?? [];
        $project = $analysis->project;
        $order = $this->contexts->sceneOrder($project);
        $code = fn (?int $sceneId) => $sceneId ? $this->contexts->code($order->search($sceneId)) : null;
        $names = $project->characters()->pluck('name', 'id');

        return [
            'id' => $analysis->id,
            'created_at' => $analysis->created_at?->toJSON(),
            'from_cache' => $fromCache,
            'stale' => $stale,
            'source' => $analysis->source,
            'model' => $analysis->model,
            'degraded' => $analysis->degraded,
            'truncated' => $analysis->truncated,
            'scene' => [
                ...$this->emotionPayload($scene),
                'summary' => $scene['summary'] ?? '',
                'evidence' => $scene['evidence'] ?? '',
                'change' => $this->changePayload($scene['change'] ?? null, $code),
            ],
            'characters' => array_map(fn (array $character) => [
                'character_id' => $character['character_id'],
                'name' => $names[$character['character_id']] ?? $character['name'],
                ...$this->emotionPayload($character),
                'evidence' => $character['evidence'],
                'out_of_character' => $character['out_of_character'],
                'out_of_character_reason' => $character['out_of_character_reason'],
                'change' => $this->changePayload($character['change'] ?? null, $code),
            ], $result['characters'] ?? []),
            'inconsistencies' => array_map(fn (array $item) => [
                'fragment' => $item['fragment'],
                'contradicts' => $item['contradicts'],
                'explanation' => $item['explanation'],
                'severity' => $item['severity'],
                'url' => $this->entryUrl($project->id, $item['entry'] ?? null),
            ], $result['inconsistencies'] ?? []),
            'suggestions' => $result['suggestions'] ?? [],
            // Votos 👍/👎 del usuario actual por sugerencia: {índice: útil}.
            'feedback' => (object) AiFeedback::query()
                ->where('emotional_analysis_id', $analysis->id)
                ->where('user_id', auth()->id())
                ->pluck('useful', 'item_index')
                ->all(),
        ];
    }

    private function emotionPayload(array $state): array
    {
        $vad = $this->vad($state + ['v' => 0.5, 'a' => 0.5, 'd' => 0.5]);

        return [
            'emotion' => $state['emotion'] ?? 'neutral',
            'labels' => array_map(fn (string $key) => __($key), $this->translator->labels(...$vad)),
            'vad' => $vad,
        ];
    }

    private function changePayload(?array $change, callable $code): array
    {
        $previous = $change['previous'] ?? null;

        return [
            'abrupt' => (bool) ($change['abrupt'] ?? false),
            'alert' => $change['alert'] ?? null,
            'explanation' => $change['explanation'] ?? '',
            'previous' => $previous ? [
                'origin' => $previous['origin'] ?? 'ai',
                'emotion' => $previous['emotion'] ?? null,
                'scene_id' => $previous['scene_id'] ?? null,
                'code' => $code($previous['scene_id'] ?? null),
            ] : null,
        ];
    }

    /**
     * Ficha que la IA dice contradecir (por nombre): lugar, regla o personaje del contexto.
     *
     * @return array{type: string, id: int}|null
     */
    private function matchEntry(string $contradicts, array $context): ?array
    {
        $needle = Str::lower(trim($contradicts, " \"'«»"));

        if ($needle === '') {
            return null;
        }

        $candidates = [
            ...($context['location'] ? [['type' => 'location', 'id' => $context['location']['id'], 'name' => $context['location']['title']]] : []),
            ...array_map(fn (array $rule) => ['type' => 'rule', 'id' => $rule['id'], 'name' => $rule['title']], $context['rules']),
            ...array_map(fn (array $character) => ['type' => 'character', 'id' => $character['id'], 'name' => $character['name']], $context['characters']),
        ];

        foreach ($candidates as $candidate) {
            $name = Str::lower($candidate['name']);

            if ($name !== '' && (Str::contains($needle, $name) || Str::contains($name, $needle))) {
                return ['type' => $candidate['type'], 'id' => $candidate['id']];
            }
        }

        return null;
    }

    private function entryUrl(int $projectId, ?array $entry): ?string
    {
        return match ($entry['type'] ?? null) {
            'location' => "/projects/{$projectId}/bible/locations?entry={$entry['id']}",
            'rule' => "/projects/{$projectId}/bible/rules?entry={$entry['id']}",
            'character' => "/projects/{$projectId}/characters?character={$entry['id']}",
            default => null,
        };
    }

    /** @return array{v: float, a: float, d: float} */
    private function vad(array $state): array
    {
        return ['v' => (float) $state['v'], 'a' => (float) $state['a'], 'd' => (float) $state['d']];
    }
}
