<?php

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Revisiones con IA de todo el proyecto (consecuencias, disonancias): sin datos de entrada;
 * exigen poder editar el proyecto porque consumen el presupuesto de IA.
 */
class ProjectAiRequest extends FormRequest
{
    public function authorize(): bool
    {
        $project = $this->route('project');

        return $project instanceof Project && ($this->user()?->can('update', $project) ?? false);
    }

    public function rules(): array
    {
        return [];
    }
}
