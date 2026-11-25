<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * 👍/👎 sobre una propuesta de la IA: una sugerencia de un análisis de escena
 * (emotional_analysis_id + item_index) o una generación (ai_generation_id).
 */
class AiFeedbackRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Votar es escribir en el proyecto: un lector (viewer) no puede.
        return $this->user()?->can('update', $this->route('project')) ?? false;
    }

    public function rules(): array
    {
        $projectId = $this->route('project')->id;

        return [
            'emotional_analysis_id' => ['nullable', 'required_without:ai_generation_id', 'prohibits:ai_generation_id', 'integer', Rule::exists('emotional_analyses', 'id')->where('project_id', $projectId)],
            'ai_generation_id' => ['nullable', 'required_without:emotional_analysis_id', 'integer', Rule::exists('ai_generations', 'id')->where('project_id', $projectId)],
            'item_index' => ['required', 'integer', 'min:0', 'max:50'],
            'useful' => ['required', 'boolean'],
        ];
    }
}
