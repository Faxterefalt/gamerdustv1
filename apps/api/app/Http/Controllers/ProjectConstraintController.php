<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectConstraintRequest;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;

class ProjectConstraintController extends Controller
{
    public function store(StoreProjectConstraintRequest $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $project->constraint()->updateOrCreate(
            ['project_id' => $project->id],
            $request->validated()
        );

        return redirect()
            ->route('projects.show', $project)
            ->with('success', 'Restricciones actualizadas.');
    }
}
