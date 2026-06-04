<?php

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;

class StoreSceneRequest extends FormRequest
{
    public function authorize(): bool
    {
        $project = $this->route('project');

        return $project instanceof Project && $this->user()?->can('update', $project);
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'order' => ['required', 'integer', 'min:1'],
            'summary' => ['nullable', 'string'],
            'conflict' => ['nullable', 'string'],
            'expected_emotion' => ['nullable', 'string', 'max:255'],
            'interest_level' => ['nullable', 'integer', 'min:1', 'max:10'],
            'scene_type' => ['nullable', 'string', 'max:255'],
            'player_decision' => ['nullable', 'string'],
            'consequence' => ['nullable', 'string'],
            'estimated_cost' => ['nullable', 'string', 'max:255'],
        ];
    }
}
