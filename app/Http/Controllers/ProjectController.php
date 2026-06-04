<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Models\Project;
use App\Services\Narrative\NarrativeValidationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Project::class);

        $projects = $request->user()
            ->projects()
            ->withCount(['loreEntries', 'characters', 'scenes', 'dialogueNodes'])
            ->latest()
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('Projects/Index', [
            'projects' => $projects,
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Project::class);

        return Inertia::render('Projects/Create');
    }

    public function store(StoreProjectRequest $request): RedirectResponse
    {
        $project = $request->user()->projects()->create($request->validated());

        return redirect()
            ->route('projects.show', $project)
            ->with('success', 'Proyecto narrativo creado.');
    }

    public function show(Project $project, NarrativeValidationService $validationService): Response
    {
        $this->authorize('view', $project);

        $validationService->run($project);

        $project->load([
            'constraint',
            'loreEntries' => fn ($query) => $query->latest()->limit(6),
            'characters' => fn ($query) => $query->latest()->limit(6),
            'scenes' => fn ($query) => $query->orderBy('order')->limit(8),
            'dialogueNodes' => fn ($query) => $query->with(['scene:id,title', 'character:id,name'])->latest()->limit(8),
            'emotionalAnalyses' => fn ($query) => $query->latest()->limit(1),
            'narrativeValidations' => fn ($query) => $query->where('resolved', false)->latest(),
            'costEstimations' => fn ($query) => $query->latest()->limit(8),
        ])->loadCount(['loreEntries', 'characters', 'scenes', 'dialogueNodes']);

        return Inertia::render('Projects/Show', [
            'project' => $project,
        ]);
    }

    public function edit(Project $project): Response
    {
        $this->authorize('update', $project);

        return Inertia::render('Projects/Edit', [
            'project' => $project,
        ]);
    }

    public function update(UpdateProjectRequest $request, Project $project): RedirectResponse
    {
        $project->update($request->validated());

        return redirect()
            ->route('projects.show', $project)
            ->with('success', 'Proyecto actualizado.');
    }

    public function destroy(Project $project): RedirectResponse
    {
        $this->authorize('delete', $project);

        $project->delete();

        return redirect()
            ->route('projects.index')
            ->with('success', 'Proyecto eliminado.');
    }
}
