<?php

namespace App\Http\Requests;

use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Invitar a un usuario existente por su correo (HU 5). Solo el dueño o un administrador.
 */
class StoreProjectMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        $project = $this->route('project');

        return $project instanceof Project && ($this->user()?->can('manage', $project) ?? false);
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['email' => mb_strtolower(trim((string) $this->input('email')))]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'role' => ['required', Rule::in(ProjectMember::ROLES)],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            /** @var Project $project */
            $project = $this->route('project');
            $user = $this->invitee();

            if (! $user) {
                $validator->errors()->add('email', __('There is no Gamerdust account with that email. Ask them to sign up first.'));
            } elseif ($user->id === $project->user_id) {
                $validator->errors()->add('email', __('That person owns the project.'));
            } elseif ($project->members()->where('user_id', $user->id)->exists()) {
                $validator->errors()->add('email', __('That person is already a member of the project.'));
            }
        }];
    }

    public function invitee(): ?User
    {
        return User::query()->whereRaw('lower(email) = ?', [$this->input('email')])->first();
    }
}
