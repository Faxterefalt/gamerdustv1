<?php

namespace App\Http\Requests;

use App\Models\Project;
use App\Models\ProjectMember;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Cambiar el rol de un miembro (HU 5). Solo el dueño o un administrador.
 */
class UpdateProjectMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        $project = $this->route('project');
        $member = $this->route('member');

        if (! $project instanceof Project || ! $member instanceof ProjectMember) {
            return false;
        }

        abort_unless($member->project_id === $project->id, 404);

        return $this->user()?->can('manage', $project) ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'role' => ['required', Rule::in(ProjectMember::ROLES)],
        ];
    }
}
