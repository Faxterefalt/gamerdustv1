<?php

namespace App\Http\Resources;

use App\Models\DialogueNode;
use App\Models\DialogueOption;
use App\Models\Project;
use App\Services\Branching\GraphInspector;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Grafo de ramificación de un proyecto: nodos = dialogue_nodes, aristas = dialogue_options con destino.
 *
 * @property Project $resource
 */
class BranchingGraphResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        $project = $this->resource;

        $nodes = $project->dialogueNodes()
            ->with(['scene:id,title', 'character:id,name', 'options' => fn ($query) => $query->orderBy('id')])
            ->orderBy('id')
            ->get();

        $inspection = app(GraphInspector::class)->inspect($nodes);

        return [
            'project_id' => $project->id,
            'start_node_id' => $inspection['start_node_id'],
            'nodes' => $nodes->map(fn (DialogueNode $node) => [
                'id' => $node->id,
                'node_key' => $node->node_key,
                'title' => $node->title,
                'display_title' => $node->displayTitle(),
                'text' => $node->text,
                'dialogue_type' => $node->dialogue_type,
                'scene_id' => $node->scene_id,
                'scene_title' => $node->scene?->title,
                'character_id' => $node->character_id,
                'character_name' => $node->character?->name,
                'emotional_tone' => $node->emotional_tone,
                'trigger_condition' => $node->trigger_condition,
                'pos_x' => $node->pos_x,
                'pos_y' => $node->pos_y,
                'is_start' => $node->id === $inspection['start_node_id'],
                'options' => $node->options->map(fn (DialogueOption $option) => [
                    'id' => $option->id,
                    'next_dialogue_node_id' => $option->next_dialogue_node_id,
                    'player_option' => $option->player_option,
                    'consequence' => $option->consequence,
                    'required_condition' => $option->required_condition,
                    'managed' => $option->isManaged(),
                ])->values()->all(),
            ])->values()->all(),
            'edges' => $nodes->flatMap(fn (DialogueNode $node) => $node->options
                ->filter(fn (DialogueOption $option) => $option->next_dialogue_node_id !== null)
                ->map(fn (DialogueOption $option) => [
                    'id' => 'option-'.$option->id,
                    'option_id' => $option->id,
                    'source' => $node->id,
                    'target' => $option->next_dialogue_node_id,
                    'label' => $option->player_option,
                    'managed' => $option->isManaged(),
                ]))->values()->all(),
            'warnings' => $inspection['warnings'],
            'scenes' => $project->scenes()->get(['id', 'title'])->all(),
            'characters' => $project->characters()->get(['id', 'name'])->all(),
        ];
    }
}
