<?php

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;

class StoreCharacterRequest extends FormRequest
{
    public function authorize(): bool
    {
        $project = $this->route('project');

        return $project instanceof Project && $this->user()?->can('update', $project);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'role' => ['nullable', 'string', 'max:255'],
            'archetype' => ['nullable', 'string', 'max:255'],
            'age' => ['nullable', 'integer', 'min:0', 'max:200'],
            'gender' => ['nullable', 'string', 'max:255'],
            'background' => ['nullable', 'string'],
            'personality' => ['nullable', 'string'],
            'speech_style' => ['nullable', 'string'],
            'motivation' => ['nullable', 'string'],
            'fear' => ['nullable', 'string'],
            'desire' => ['nullable', 'string'],
            'emotional_arc' => ['nullable', 'string'],
            'visual_description' => ['nullable', 'string'],
            'voice_notes' => ['nullable', 'string'],
        ];
    }
}
