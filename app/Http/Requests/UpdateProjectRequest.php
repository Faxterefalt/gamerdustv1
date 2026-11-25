<?php

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        $project = $this->route('project');

        return $project instanceof Project && $this->user()?->can('update', $project);
    }

    public function rules(): array
    {
        $project = $this->route('project');

        return [
            'title' => ['required', 'string', 'max:255'],
            // Legacy projects may hold a value outside the current lists; keeping it unchanged stays valid.
            'game_genre' => ['required', Rule::in([...StoreProjectRequest::GENRES, $project->game_genre])],
            'language' => ['required', Rule::in(StoreProjectRequest::LANGUAGES)],
            'narrative_type' => ['required', Rule::in(StoreProjectRequest::NARRATIVE_TYPES)],
            'premise' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
