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
                'message' => __('The project has no defined premise.'),
                'recommendation' => __('Summarize the dramatic core in a short premise before expanding scenes.'),
            ];
        }

        foreach ($project->characters as $character) {
            if (blank($character->motivation)) {
                $findings[] = [
                    'validation_type' => 'character_without_motivation',
                    'severity' => 'medium',
                    'message' => __('The character :name has no motivation.', ['name' => $character->name]),
                    'recommendation' => __('Define what they want, why they want it and what they are willing to sacrifice.'),
                ];
            }
        }

        foreach ($project->scenes as $scene) {
            if (blank($scene->conflict)) {
                $findings[] = [
                    'validation_type' => 'scene_without_conflict',
                    'severity' => 'medium',
                    'message' => __('The scene :title has no clear conflict.', ['title' => $scene->title]),
                    'recommendation' => __('Add a tension, obstacle or decision that drives the scene.'),
                ];
            }
        }

        foreach ($project->loreEntries as $entry) {
            if (blank($entry->narrative_function)) {
                $findings[] = [
                    'validation_type' => 'lore_without_function',
                    'severity' => 'low',
                    'message' => __('The lore entry :title does not state a narrative function.', ['title' => $entry->title]),
                    'recommendation' => __('Connect this piece of the world with characters, conflict or player decisions.'),
                ];
            }
        }

        return collect($findings)
            ->map(fn (array $finding) => $project->narrativeValidations()->create($finding));
    }
}
