<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\User;

/**
 * Acceso por rol (HU 5). El dueño es administrador implícito.
 *
 *   view   → cualquier miembro (lectura, exportaciones y reportes)
 *   update → dueño, admin o editor (toda escritura, incluida la IA)
 *   manage → dueño o admin (invitar, cambiar el rol y retirar miembros)
 *   delete → solo el dueño
 */
class ProjectPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Project $project): bool
    {
        return $project->roleFor($user) !== null;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Project $project): bool
    {
        return in_array($project->roleFor($user), ProjectMember::WRITERS, true);
    }

    public function manage(User $user, Project $project): bool
    {
        return in_array($project->roleFor($user), ProjectMember::MANAGERS, true);
    }

    public function delete(User $user, Project $project): bool
    {
        return $project->user_id === $user->id;
    }
}
