<?php

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;

class StoreProjectConstraintRequest extends FormRequest
{
    public function authorize(): bool
    {
        $project = $this->route('project');

        return $project instanceof Project && $this->user()?->can('update', $project);
    }

    public function rules(): array
    {
        return [
            'premise' => ['nullable', 'string', 'max:2000'],
            'central_theme' => ['nullable', 'string', 'max:255'],
            'central_conflict' => ['nullable', 'string', 'max:2000'],
            'player_objective' => ['nullable', 'string', 'max:2000'],
            'setting' => ['nullable', 'string', 'max:2000'],
            'expected_outcome' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
