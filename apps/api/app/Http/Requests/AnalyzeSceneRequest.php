<?php

namespace App\Http\Requests;

use App\Models\Project;
use App\Models\Scene;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Analizar las emociones de una escena guardada. `force` = Reanalizar (ignora la caché).
 */
class AnalyzeSceneRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Project $project */
        $project = $this->route('project');
        /** @var Scene $scene */
        $scene = $this->route('scene');

        abort_unless($scene->project_id === $project->id, 404);

        return $this->user()?->can('update', $project) ?? false;
    }

    public function rules(): array
    {
        return [
            'force' => ['sometimes', 'boolean'],
        ];
    }
}
