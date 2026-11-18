<?php

namespace App\Services\Narrative;

use App\Models\DialogueNode;
use App\Models\Project;
use App\Models\Scene;
use App\Services\Cost\NarrativeCostEstimatorService;

/**
 * Consumo actual del proyecto frente a sus restricciones de producción (HU 7 y 60).
 *
 * - Páginas estimadas: palabras de todos los bloques del guion / `gamerdust.validation.words_per_page`
 *   (250 por defecto), redondeado hacia arriba. Solo cuenta `scenes.script`.
 * - Coste: suma de los puntos de la heurística de NarrativeCostEstimatorService calculados en vivo
 *   para cada escena y cada nodo de diálogo (no se leen las filas antiguas de cost_estimations).
 */
class ProductionUsage
{
    public function __construct(private readonly NarrativeCostEstimatorService $estimator) {}

    /** @return array{characters: int, words: int, pages: int, words_per_page: int, cost_points: int} */
    public function for(Project $project): array
    {
        $scenes = $project->scenes()->withCount('dialogueNodes')->get();
        $nodes = $project->dialogueNodes()->withCount('options')->get();
        $words = $scenes->sum(fn (Scene $scene) => self::words($scene->script ?? []));
        $perPage = max(1, (int) config('gamerdust.validation.words_per_page', 250));

        return [
            'characters' => $project->characters()->count(),
            'words' => $words,
            'pages' => (int) ceil($words / $perPage),
            'words_per_page' => $perPage,
            'cost_points' => $scenes->sum(fn (Scene $scene) => $this->estimator->estimate($scene)['cost_score'])
                + $nodes->sum(fn (DialogueNode $node) => $this->estimator->estimate($node)['cost_score']),
        ];
    }

    /** @param  array<int, array{text?: string|null}>  $blocks */
    public static function words(array $blocks): int
    {
        return array_sum(array_map(
            fn (array $block) => count(preg_split('/\s+/u', trim((string) ($block['text'] ?? '')), -1, PREG_SPLIT_NO_EMPTY)),
            $blocks,
        ));
    }
}
