<?php

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDialogueNodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $project = $this->route('project');

        return $project instanceof Project && $this->user()?->can('update', $project);
    }

    public function rules(): array
    {
        /** @var Project $project */
        $project = $this->route('project');

        $nodeKeyRule = Rule::unique('dialogue_nodes', 'node_key')
            ->where('project_id', $project->id);

        if ($dialogue = $this->route('dialogue')) {
            $nodeKeyRule->ignore($dialogue->id);
        }

        return [
            'scene_id' => ['nullable', Rule::exists('scenes', 'id')->where('project_id', $project->id)],
            'character_id' => ['nullable', Rule::exists('characters', 'id')->where('project_id', $project->id)],
            'node_key' => ['required', 'string', 'max:255', $nodeKeyRule],
            'dialogue_type' => [
                'required',
                Rule::in([
                    'cutscene',
                    'ambient',
                    'bark',
                    'interactive_no_branch',
                    'interactive_rubber_banding',
                    'interactive_alternative_paths',
                ]),
            ],
            'text' => ['required', 'string'],
            'emotional_tone' => ['nullable', 'string', 'max:255'],
            'trigger_condition' => ['nullable', 'string'],
            'options' => ['nullable', 'array'],
            'options.*.player_option' => ['required_with:options', 'string'],
            'options.*.next_dialogue_node_id' => ['nullable', Rule::exists('dialogue_nodes', 'id')->where('project_id', $project->id)],
            'options.*.consequence' => ['nullable', 'string'],
            'options.*.required_condition' => ['nullable', 'string'],
        ];
    }
}
