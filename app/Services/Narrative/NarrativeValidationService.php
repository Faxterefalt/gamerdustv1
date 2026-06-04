<?php

namespace App\Services\Narrative;

use App\Models\NarrativeValidation;
use App\Models\Project;
use Illuminate\Support\Collection;

class NarrativeValidationService
{
    /**
     * @return Collection<int, NarrativeValidation>
     */
    public function run(Project $project): Collection
    {
        $project->loadMissing(['characters', 'scenes', 'loreEntries']);

        $project->narrativeValidations()->where('resolved', false)->delete();

        $findings = [];

        if (blank($project->premise)) {
            $findings[] = [
                'validation_type' => 'missing_project_premise',
                'severity' => 'high',
                'message' => 'El proyecto no tiene premisa definida.',
                'recommendation' => 'Resume el nucleo dramatico en una premisa breve antes de expandir escenas.',
            ];
        }

        foreach ($project->characters as $character) {
            if (blank($character->motivation)) {
                $findings[] = [
                    'validation_type' => 'character_without_motivation',
                    'severity' => 'medium',
                    'message' => "El personaje {$character->name} no tiene motivacion.",
                    'recommendation' => 'Define que quiere, por que lo quiere y que esta dispuesto a sacrificar.',
                ];
            }
        }

        foreach ($project->scenes as $scene) {
            if (blank($scene->conflict)) {
                $findings[] = [
                    'validation_type' => 'scene_without_conflict',
                    'severity' => 'medium',
                    'message' => "La escena {$scene->title} no tiene conflicto claro.",
                    'recommendation' => 'Agrega una tension, obstaculo o decision que empuje la escena.',
                ];
            }
        }

        foreach ($project->loreEntries as $entry) {
            if (blank($entry->narrative_function)) {
                $findings[] = [
                    'validation_type' => 'lore_without_function',
                    'severity' => 'low',
                    'message' => "La entrada de lore {$entry->title} no declara funcion narrativa.",
                    'recommendation' => 'Conecta esta pieza de mundo con personajes, conflicto o decisiones del jugador.',
                ];
            }
        }

        return collect($findings)
            ->map(fn (array $finding) => $project->narrativeValidations()->create($finding));
    }
}
