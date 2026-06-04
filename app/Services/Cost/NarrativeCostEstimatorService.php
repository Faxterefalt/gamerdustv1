<?php

namespace App\Services\Cost;

use App\Models\CostEstimation;
use App\Models\DialogueNode;
use App\Models\Project;
use App\Models\Scene;
use Illuminate\Database\Eloquent\Model;

class NarrativeCostEstimatorService
{
    public function estimate(Model $costable): array
    {
        return match (true) {
            $costable instanceof Scene => $this->estimateScene($costable),
            $costable instanceof DialogueNode => $this->estimateDialogue($costable),
            default => [
                'cost_level' => 'low',
                'cost_score' => 1,
                'cost_factors' => ['generic_narrative_asset'],
                'explanation' => 'Estimacion basica para un elemento narrativo simple.',
            ],
        };
    }

    public function createFor(Project $project, Model $costable): CostEstimation
    {
        return $project->costEstimations()->create([
            ...$this->estimate($costable),
            'costable_type' => $costable::class,
            'costable_id' => $costable->getKey(),
        ]);
    }

    private function estimateScene(Scene $scene): array
    {
        $factors = [];
        $score = 1;

        if (filled($scene->player_decision)) {
            $score += 2;
            $factors[] = 'player_decision';
        }

        if (filled($scene->consequence)) {
            $score += 2;
            $factors[] = 'narrative_consequence';
        }

        if ($scene->dialogueNodes()->count() >= 4) {
            $score += 3;
            $factors[] = 'multiple_dialogue_nodes';
        }

        return [
            'cost_level' => $score >= 6 ? 'high' : ($score >= 3 ? 'medium' : 'low'),
            'cost_score' => $score,
            'cost_factors' => $factors,
            'explanation' => 'Estimacion basada en decisiones, consecuencias y cantidad de dialogos asociados.',
        ];
    }

    private function estimateDialogue(DialogueNode $dialogue): array
    {
        $lowCostTypes = ['bark', 'ambient'];
        $isLow = in_array($dialogue->dialogue_type, $lowCostTypes, true);
        $optionCount = $dialogue->options()->count();
        $score = $isLow ? 1 : 3;

        if ($optionCount > 1) {
            $score += 2;
        }

        return [
            'cost_level' => $score >= 5 ? 'high' : ($score >= 3 ? 'medium' : 'low'),
            'cost_score' => $score,
            'cost_factors' => array_filter([
                $dialogue->dialogue_type,
                $optionCount > 1 ? 'branching_options' : null,
            ]),
            'explanation' => 'Estimacion basada en tipo de dialogo y ramificacion declarada.',
        ];
    }
}
