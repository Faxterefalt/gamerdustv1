<?php

namespace App\Http\Requests\Branching;

use App\Models\DialogueNode;
use App\Models\DialogueOption;
use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class BranchingRequest extends FormRequest
{
    public function authorize(): bool
    {
        $project = $this->route('project');

        if (! $project instanceof Project || ! $this->user()?->can('update', $project)) {
            return false;
        }

        $node = $this->route('node');
        $option = $this->route('option');

        abort_if($node instanceof DialogueNode && $node->project_id !== $project->id, 404);
        abort_if($option instanceof DialogueOption && ! $option->dialogueNode()->where('project_id', $project->id)->exists(), 404);

        return true;
    }

    protected function project(): Project
    {
        return $this->route('project');
    }

    protected function nodeFieldRules(bool $partial): array
    {
        $project = $this->project();
        $prefix = $partial ? ['sometimes'] : [];

        return [
            'scene_id' => [...$prefix, 'nullable', Rule::exists('scenes', 'id')->where('project_id', $project->id)],
            'character_id' => [...$prefix, 'nullable', Rule::exists('characters', 'id')->where('project_id', $project->id)],
            'dialogue_type' => [...$prefix, $partial ? 'required' : 'nullable', Rule::in(DialogueNode::TYPES)],
            'text' => [...$prefix, 'nullable', 'string', 'max:65000'],
            'emotional_tone' => [...$prefix, 'nullable', 'string', 'max:255'],
            'trigger_condition' => [...$prefix, 'nullable', 'string', 'max:65000'],
            'pos_x' => [...$prefix, 'nullable', 'numeric', 'between:-1000000,1000000'],
            'pos_y' => [...$prefix, 'nullable', 'numeric', 'between:-1000000,1000000'],
        ];
    }

    protected function optionRules(bool $partial): array
    {
        $prefix = $partial ? ['sometimes'] : [];

        return [
            'player_option' => [...$prefix, 'required', 'string', 'max:2000'],
            'next_dialogue_node_id' => [...$prefix, 'nullable', 'integer', Rule::exists('dialogue_nodes', 'id')->where('project_id', $this->project()->id)],
            'consequence' => [...$prefix, 'nullable', 'string', 'max:65000'],
            'required_condition' => [...$prefix, 'nullable', 'string', 'max:65000'],
        ];
    }
}
