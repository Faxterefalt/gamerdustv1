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

        // Narrative type, scenes, decisions and connections are never touched here.
        DB::transaction(function () use ($project, $data) {
            $project->update([
                'premise' => $data['premise'] ?? null,
                'central_conflict' => $data['central_conflict'] ?? null,
            ]);

            $project->constraint()->updateOrCreate(
                ['project_id' => $project->id],
                [
                    'central_theme' => $data['central_theme'] ?? null,
                    'player_objective' => $data['player_objective'] ?? null,
                    'setting' => $data['setting'] ?? null,
                    'expected_outcome' => $data['expected_outcome'] ?? null,
                ]
            );
        });

        return back()->with('success', __('Narrative setup saved.'));
    }
}
