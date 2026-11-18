<?php

namespace App\Services\Branching;

use App\Http\Resources\BranchingGraphResource;
use App\Models\Project;
use Illuminate\Http\Request;

/**
 * HTML autónomo de los diálogos (mapa + modo Jugar con estado). Lo usan la exportación de Reportes
 * (descarga) y "Probar recorrido" del editor (se muestra en el navegador). Solo lee: jugar nunca
 * escribe en la BD; el estado de las variables vive en el navegador.
 */
class DialoguePlayerView
{
    /** Claves de traducción de los tipos de diálogo (las mismas que `branching/layout.ts`). */
    private const DIALOGUE_TYPE_LABELS = [
        'cutscene' => 'Cutscene',
        'ambient' => 'Ambient',
        'bark' => 'Bark',
        'interactive_no_branch' => 'Interactive, no branches',
        'interactive_rubber_banding' => 'Interactive, rubber-banding',
        'interactive_alternative_paths' => 'Interactive, alternative paths',
    ];

    public function render(Request $request, Project $project, bool $playtest = false, ?int $startNodeId = null): string
    {
        return view('reports.dialogues', [
            'project' => $project,
            'graph' => (new BranchingGraphResource($project))->resolve($request),
            'typeLabels' => array_map(fn (string $label) => __($label), self::DIALOGUE_TYPE_LABELS),
            'playtest' => $playtest,
            'startNodeId' => $startNodeId,
        ])->render();
    }
}
