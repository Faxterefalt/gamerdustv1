<?php

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLoreEntryRequest extends FormRequest
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
            'type' => ['required', Rule::in(['rule', 'history', 'faction', 'location', 'object', 'event', 'concept'])],
            'description' => ['nullable', 'string'],
            'narrative_function' => ['nullable', 'string'],
            'emotional_tone' => ['nullable', 'string', 'max:255'],
        ];
    }
}
