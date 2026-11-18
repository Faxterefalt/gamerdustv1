<?php

namespace App\Http\Requests;

use App\Models\NarrativeValidation;
use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateNarrativeValidationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $project = $this->route('project');
        $validation = $this->route('validation');

        if (! $project instanceof Project || ! $this->user()?->can('update', $project)) {
            return false;
        }

        abort_unless($validation instanceof NarrativeValidation && $validation->project_id === $project->id, 404);

        return true;
    }

    public function rules(): array
    {
        return [
            // Sin estado se marca como resuelta (compatibilidad con el botón anterior).
            'status' => ['nullable', Rule::in(NarrativeValidation::STATUSES)],
        ];
    }
}
