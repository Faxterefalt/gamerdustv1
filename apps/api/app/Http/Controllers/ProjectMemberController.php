<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectMemberRequest;
use App\Http\Requests\UpdateProjectMemberRequest;
use App\Models\EditLock;
use App\Models\Project;
use App\Models\ProjectMember;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Miembros del proyecto (HU 5): invitar a un usuario existente, cambiar su rol y retirarlo.
 * Al retirarlo pierde el acceso en la siguiente petición (la policy consulta project_members).
 */
class ProjectMemberController extends Controller
{
    public function store(StoreProjectMemberRequest $request, Project $project): RedirectResponse
    {
        $user = $request->invitee();

        $project->members()->create([
            'user_id' => $user->id,
            'role' => $request->validated('role'),
            'invited_by' => $request->user()->id,
        ]);

        return back()->with('success', __(':name now has access to the project.', ['name' => $user->name]));
    }

    public function update(UpdateProjectMemberRequest $request, Project $project, ProjectMember $member): RedirectResponse
    {
        $member->update(['role' => $request->validated('role')]);

        return back()->with('success', __('Role updated.'));
    }

    /**
     * Un administrador retira a cualquier miembro; cualquier miembro puede salir del proyecto.
     */
    public function destroy(Request $request, Project $project, ProjectMember $member): RedirectResponse
    {
        abort_unless($member->project_id === $project->id, 404);

        $leaving = $member->user_id === $request->user()->id;
        abort_unless($leaving || $request->user()->can('manage', $project), 403);

        $name = $member->user?->name;
        $member->delete();
        // Sus bloqueos de edición dejan de anunciarse.
        EditLock::where('project_id', $project->id)->where('user_id', $member->user_id)->delete();

        return $leaving
            ? redirect()->route('projects.index')->with('success', __('You left the project.'))
            : back()->with('success', __(':name no longer has access to the project.', ['name' => $name]));
    }
}
