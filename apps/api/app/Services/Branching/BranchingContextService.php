<?php

namespace App\Services\Branching;

use App\Models\DialogueNode;

/**
 * Reúne el contexto narrativo de un nodo para el motor de análisis existente. Solo lectura.
 */
class BranchingContextService
{
    public function forNode(DialogueNode $node): array
    {
        $node->loadMissing(['scene', 'character', 'options.nextDialogueNode:id,node_key,title']);

        return [
            'node' => [
                'id' => $node->id,
                'node_key' => $node->node_key,
                'title' => $node->displayTitle(),
                'text' => $node->text,
                'dialogue_type' => $node->dialogue_type,
                'emotional_tone' => $node->emotional_tone,
                'trigger_condition' => $node->trigger_condition,
            ],
            'scene' => $node->scene?->only(['id', 'title', 'summary', 'conflict', 'expected_emotion', 'scene_type']),
            'character' => $node->character?->only(['id', 'name', 'role', 'motivation', 'speech_style', 'emotional_arc']),
            'options' => $node->options->map(fn ($option) => [
                'id' => $option->id,
                'player_option' => $option->player_option,
                'consequence' => $option->consequence,
                'required_condition' => $option->required_condition,
                'target' => $option->nextDialogueNode?->displayTitle(),
            ])->values()->all(),
            'lore' => $node->project->loreEntries()->get(['id', 'title', 'type', 'description', 'narrative_function', 'emotional_tone'])->all(),
        ];
    }
}
