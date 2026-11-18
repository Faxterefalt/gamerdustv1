<?php

namespace App\Services\Branching;

use App\Models\DialogueNode;

/**
 * Contexto narrativo de un nodo para el panel del editor (escena, hablante, opciones y Biblia). Solo lectura.
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
            // Entradas de la Biblia vinculadas al nodo (dialogue_node_lore_entry).
            'lore' => $node->loreEntries()->orderBy('title')->get(['lore_entries.id', 'title', 'type', 'description', 'narrative_function', 'emotional_tone'])
                ->map(fn ($entry) => $entry->only(['id', 'title', 'type', 'description', 'narrative_function', 'emotional_tone']))->all(),
        ];
    }
}
