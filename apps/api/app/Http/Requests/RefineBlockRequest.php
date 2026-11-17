<?php

namespace App\Http\Requests;

use App\Models\Project;
use App\Models\Scene;
use App\Services\Assist\BlockRefineService;
use App\Services\Script\ScriptService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Refinar un bloque del guion. El bloque viaja desde el borrador local del editor
 * (puede no estar guardado): la propuesta nunca se guarda en el servidor.
 */
class RefineBlockRequest extends FormRequest
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
            'block' => ['required', 'array'],
            'block.id' => ['required', 'string', 'max:64'],
            'block.kind' => ['required', Rule::in(ScriptService::KINDS)],
            'block.text' => ['required', 'string', 'max:5000'],
            'goal' => ['required', Rule::in(BlockRefineService::GOALS)],
            'character_id' => [
                'nullable',
                'required_if:goal,true_to_character',
                'integer',
                Rule::exists('characters', 'id')->where('project_id', $this->route('project')->id),
            ],
            'instruction' => ['nullable', 'string', 'max:300'],
        ];
    }
}
