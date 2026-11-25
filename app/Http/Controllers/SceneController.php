<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSceneRequest;
use App\Models\Project;
use App\Models\Scene;
use App\Services\Cost\NarrativeCostEstimatorService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class SceneController extends Controller
{
    public function index(Project $project): Response
    {
        $this->authorize('view', $project);

        return Inertia::render('Scenes/Index', [
            'project' => $project,
            'scenes' => $project->scenes()->withCount('dialogueNodes')->paginate(20),
        ]);
    }

    public function create(Project $project): Response
    {
        $this->authorize('update', $project);

        return Inertia::render('Scenes/Create', [
            'project' => $project,
        ]);
    }

    public function store(StoreSceneRequest $request, Project $project, NarrativeCostEstimatorService $estimator): RedirectResponse
    {
        $this->authorize('update', $project);

        $scene = $project->scenes()->create($request->validated());
        $cost = $estimator->createFor($project, $scene);
        $scene->update(['estimated_cost' => $cost->cost_level]);

        return redirect()
            ->route('projects.scenes.index', $project)
            ->with('success', __('Scene created.'));
    }

    public function edit(Project $project, Scene $scene): Response
    {
        $this->authorizeScene($project, $scene);

        return Inertia::render('Scenes/Edit', [
            'project' => $project,
            'scene' => $scene,
        ]);
    }

    public function update(StoreSceneRequest $request, Project $project, Scene $scene, NarrativeCostEstimatorService $estimator): RedirectResponse
    {
        $this->authorizeScene($project, $scene);

        $scene->update($request->validated());
        $cost = $estimator->createFor($project, $scene);
        $scene->update(['estimated_cost' => $cost->cost_level]);

        return redirect()
            ->route('projects.scenes.index', $project)
            ->with('success', __('Scene updated.'));
    }

    public function destroy(Project $project, Scene $scene): RedirectResponse
    {
        $this->authorizeScene($project, $scene);

        $scene->delete();

        return back()->with('success', __('Scene deleted.'));
    }

    private function authorizeScene(Project $project, Scene $scene): void
    {
        $this->authorize('update', $project);
        abort_unless($scene->project_id === $project->id, 404);
    }
}
