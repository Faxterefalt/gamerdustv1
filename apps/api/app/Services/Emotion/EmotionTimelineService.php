<?php

namespace App\Services\Emotion;

use App\Models\Character;
use App\Models\CharacterEmotionalState;
use App\Models\EmotionalAnalysis;
use App\Models\Project;
use App\Models\Scene;

/**
 * Evolución emocional del proyecto para los gráficos de "Análisis IA" (solo lectura, sin IA):
 * arco de la historia (tono y tensión por escena) y emociones de cada personaje
 * desde su estado inicial ("Definido por ti") hasta lo que detectó la IA en cada escena.
 */
class EmotionTimelineService
{
    public function __construct(
        private readonly SceneContextBuilder $contexts,
        private readonly EmotionTranslator $translator,
    ) {}

    public function build(Project $project): array
    {
        $scenes = $project->scenes()->reorder()->orderBy('order')->orderBy('id')->get();
        $codes = $scenes->values()->mapWithKeys(fn (Scene $scene, int $index) => [$scene->id => $this->contexts->code($index)]);

        // Último análisis de cada escena (escala 0-1: los antiguos sin hash no cuentan).
        $analyses = EmotionalAnalysis::query()
            ->where('project_id', $project->id)
            ->where('analyzable_type', Scene::class)
            ->whereNotNull('content_hash')
            ->latest('id')
            ->get()
            ->unique('analyzable_id')
            ->keyBy('analyzable_id');

        $stale = [];
        $scenePoints = $scenes->map(function (Scene $scene) use ($analyses, $codes, &$stale) {
            $analysis = $analyses->get($scene->id);
            $state = $analysis?->result['scene'] ?? null;
            $stale[$scene->id] = $analysis !== null && $analysis->content_hash !== $this->contexts->contentHash($scene);

            return [
                'id' => $scene->id,
                'code' => $codes[$scene->id],
                'title' => $scene->title,
                'act' => $scene->act,
                'analyzed' => $state !== null,
                'stale' => $stale[$scene->id],
                'emotion' => $state['emotion'] ?? null,
                ...($state ? $this->point($state) : ['vad' => null, 'labels' => null]),
                'summary' => $state['summary'] ?? null,
                'alert' => $state['change']['alert'] ?? null,
                'explanation' => $state['change']['explanation'] ?? null,
            ];
        })->values();

        $states = CharacterEmotionalState::query()
            ->where('project_id', $project->id)
            ->whereIn('scene_id', $scenes->pluck('id'))
            ->get()
            ->groupBy('character_id');

        $characters = $project->characters()->orderBy('name')->get()
            ->map(function (Character $character) use ($states, $codes, $stale) {
                $points = [];

                if ($start = $this->translator->fromAuthor($character->initial_emotion, $character->initial_intensity)) {
                    $points[] = [
                        'scene_id' => null,
                        'code' => null,
                        'origin' => 'author',
                        'emotion' => $character->initial_emotion,
                        ...$this->point($start),
                        'evidence' => null,
                        'explanation' => null,
                        'alert' => null,
                        'out_of_character' => false,
                        'stale' => false,
                    ];
                }

                $ordered = ($states->get($character->id) ?? collect())
                    ->sortBy(fn (CharacterEmotionalState $state) => array_search($state->scene_id, $codes->keys()->all(), true));

                foreach ($ordered as $state) {
                    $points[] = [
                        'scene_id' => $state->scene_id,
                        'code' => $codes[$state->scene_id],
                        'origin' => 'ai',
                        'emotion' => $state->emotion,
                        ...$this->point($state->vad()),
                        'evidence' => $state->evidence,
                        'explanation' => $state->change_explanation,
                        'alert' => EmotionChangeDetector::alertFor($state->abrupt_change, $state->change_justified),
                        'out_of_character' => $state->out_of_character,
                        'stale' => $stale[$state->scene_id] ?? false,
                    ];
                }

                return ['id' => $character->id, 'name' => $character->name, 'points' => $points];
            })
            ->filter(fn (array $character) => $character['points'] !== [])
            ->values();

        return [
            'scenes' => $scenePoints,
            'characters' => $characters,
            'reviews' => $this->reviews($scenePoints->all(), $characters->all()),
        ];
    }

    /**
     * "Momentos a revisar": cambios abruptos sin causa visible (alertas rojas).
     */
    private function reviews(array $scenes, array $characters): array
    {
        $titles = array_column($scenes, 'title', 'id');
        $reviews = [];

        foreach ($scenes as $scene) {
            if ($scene['alert'] === EmotionChangeDetector::RED) {
                $reviews[] = ['scene_id' => $scene['id'], 'code' => $scene['code'], 'title' => $scene['title'], 'character_id' => null, 'name' => null, 'explanation' => $scene['explanation']];
            }
        }

        foreach ($characters as $character) {
            foreach ($character['points'] as $point) {
                if ($point['alert'] === EmotionChangeDetector::RED) {
                    $reviews[] = [
                        'scene_id' => $point['scene_id'],
                        'code' => $point['code'],
                        'title' => $titles[$point['scene_id']] ?? '',
                        'character_id' => $character['id'],
                        'name' => $character['name'],
                        'explanation' => $point['explanation'],
                    ];
                }
            }
        }

        usort($reviews, fn (array $a, array $b) => strcmp((string) $a['code'], (string) $b['code']));

        return $reviews;
    }

    /** @param array{v: float, a: float, d: float} $vad */
    private function point(array $vad): array
    {
        $vad = ['v' => (float) $vad['v'], 'a' => (float) $vad['a'], 'd' => (float) $vad['d']];

        return [
            'vad' => $vad,
            'labels' => array_map(fn (string $key) => __($key), $this->translator->labels(...$vad)),
        ];
    }
}
