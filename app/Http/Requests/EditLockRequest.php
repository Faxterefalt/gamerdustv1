<?php

namespace App\Http\Requests;

use App\Models\DialogueNode;
use App\Models\Project;
use App\Models\Scene;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Latido o liberación de un bloqueo blando (HU 26). Solo quien puede escribir edita (y bloquea).
 */
class EditLockRequest extends FormRequest
{
    /** Tipos que se pueden bloquear. */
    public const TYPES = ['scene' => Scene::class, 'node' => DialogueNode::class];

    public function authorize(): bool
    {
        $project = $this->route('project');

        return $project instanceof Project && ($this->user()?->can('update', $project) ?? false);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(array_keys(self::TYPES))],
            'id' => ['required', 'integer'],
        ];
    }

    /** Escena o nodo del proyecto de la ruta (404 si es de otro proyecto). */
    public function lockable(): Model
    {
        /** @var Project $project */
        $project = $this->route('project');
        $class = self::TYPES[$this->validated('type')];

        return $class::query()->where('project_id', $project->id)->findOrFail($this->validated('id'));
    }
}
