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

    /** Los límites vacíos llegan como cadena vacía desde el formulario: null = sin límite. */
    protected function prepareForValidation(): void
    {
        foreach (['max_characters', 'max_pages', 'max_budget'] as $field) {
            if ($this->input($field) === '') {
                $this->merge([$field => null]);
            }
        }
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
            'assignment' => ['nullable', 'string', 'max:2000'],
            // Restricciones de producción (HU 7).
            'max_characters' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'max_pages' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'max_budget' => ['nullable', 'numeric', 'min:0', 'max:99999999.99', 'decimal:0,2'],
            'requires_twist' => ['nullable', 'boolean'],
        ];
    }
}
