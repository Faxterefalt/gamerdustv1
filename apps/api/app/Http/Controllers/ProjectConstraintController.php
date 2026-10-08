<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectConstraintRequest;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class ProjectConstraintController extends Controller
{
    public function store(StoreProjectConstraintRequest $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $data = $request->validated();

        // Existing scenes, decisions and connections are never touched here.
        DB::transaction(function () use ($project, $data) {
            $project->update([
                'premise' => $data['premise'],
                'central_conflict' => $data['central_conflict'],
                'narrative_type' => $data['narrative_type'],
            ]);

            $project->constraint()->updateOrCreate(
                ['project_id' => $project->id],
                [
                    'narrative_genre' => $data['narrative_genre'],
                    'central_theme' => $data['central_theme'],
                    'setting' => $data['setting'],
                    'player_objective' => $data['player_objective'],
                ]
            );
        });

        return redirect()
            ->route('projects.show', $project)
            ->with('success', 'Configuración narrativa guardada.');
    }
}
