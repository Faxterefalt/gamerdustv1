<?php

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'background' => ['nullable', 'string', 'max:5000'],
            'personality' => ['nullable', 'string', 'max:5000'],
            'speech_style' => ['nullable', 'string', 'max:5000'],
            'motivation' => ['nullable', 'string', 'max:5000'],
            'values' => ['nullable', 'string', 'max:5000'],
            'inner_conflict' => ['nullable', 'string', 'max:5000'],
            'fear' => ['nullable', 'string', 'max:5000'],
            'desire' => ['nullable', 'string', 'max:5000'],
            'emotional_arc' => ['nullable', 'string', 'max:5000'],
            'visual_description' => ['nullable', 'string', 'max:5000'],
            'voice_notes' => ['nullable', 'string', 'max:5000'],
            'limits' => ['nullable', 'string', 'max:5000'],
            // Estado emocional inicial elegido por el autor (sin valores numéricos).
            'initial_emotion' => ['nullable', 'string', Rule::in(array_keys(config('gamerdust.emotion.emotions')))],
            'initial_intensity' => ['nullable', 'string', Rule::in(array_keys(config('gamerdust.emotion.intensity')))],
            // Concept art del personaje (opcional).
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'remove_image' => ['nullable', 'boolean'],
            // Escenas en las que aparece: deben ser del mismo proyecto.
            'scene_ids' => ['nullable', 'array', 'max:200'],
            'scene_ids.*' => ['integer', 'distinct', Rule::exists('scenes', 'id')->where('project_id', $this->route('project')->id)],
        ];
    }
}
