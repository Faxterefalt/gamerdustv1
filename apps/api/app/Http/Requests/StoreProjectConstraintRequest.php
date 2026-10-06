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

    protected function prepareForValidation(): void
    {
        foreach (['secondary_emotions', 'required_elements', 'forbidden_elements'] as $field) {
            if (is_string($this->input($field))) {
                $this->merge([
                    $field => collect(preg_split('/[\r\n,]+/', $this->input($field)))
                        ->map(fn (string $value) => trim($value))
                        ->filter()
                        ->values()
                        ->all(),
                ]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'main_emotional_tone' => ['nullable', 'string', 'max:255'],
            'dominant_emotion' => ['nullable', 'string', 'max:255'],
            'secondary_emotions' => ['nullable', 'array'],
            'secondary_emotions.*' => ['string', 'max:255'],
            'world_type' => ['nullable', 'string', 'max:255'],
            'player_role' => ['nullable', 'string', 'max:255'],
            'branching_level' => ['nullable', 'string', 'max:255'],
            'required_elements' => ['nullable', 'array'],
            'required_elements.*' => ['string', 'max:255'],
            'forbidden_elements' => ['nullable', 'array'],
            'forbidden_elements.*' => ['string', 'max:255'],
            'creative_notes' => ['nullable', 'string'],
        ];
    }
}
