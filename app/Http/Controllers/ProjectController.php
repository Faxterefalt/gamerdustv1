<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Services\Narrative\NarrativeValidationService;
use App\Services\Narrative\ProductionUsage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Project::class);

        $user = $request->user();

        // Propios y compartidos; el favorito y el rol son los del usuario que mira.
        $projects = Project::query()
            ->accessibleBy($user)
            ->with(['user:id,name', 'members' => fn ($query) => $query->where('user_id', $user->id)])
            ->withCount(['loreEntries', 'characters', 'scenes', 'dialogueNodes'])
            ->latest()
            ->paginate(12)
            ->withQueryString()
            ->through(function (Project $project) use ($user) {
                $membership = $project->members->first();
                $data = $project->toArray();
                unset($data['members']);

                return [
                    ...$data,
                    'favorite' => $membership ? $membership->favorite : $project->favorite,
                    'role' => $membership ? $membership->role : 'owner',
                    'owner' => $project->user_id === $user->id ? null : $project->user?->name,
                ];
            });

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
            ->with('success', __('Narrative project created.'));
    }

    public function show(Project $project, NarrativeValidationService $validationService, ProductionUsage $usage): Response
    {
        $this->authorize('view', $project);

        $validations = $validationService->panel($project);

        $project->load([
            'constraint',
            'loreEntries' => fn ($query) => $query->latest()->limit(6),
            'characters' => fn ($query) => $query->latest()->limit(6),
            'scenes' => fn ($query) => $query->orderBy('order')->limit(8),
            'dialogueNodes' => fn ($query) => $query->with(['scene:id,title', 'character:id,name'])->latest()->limit(8),
            'emotionalAnalyses' => fn ($query) => $query->latest()->limit(1),
            'costEstimations' => fn ($query) => $query->latest()->limit(8),
        ])->loadCount(['loreEntries', 'characters', 'scenes', 'dialogueNodes']);

        return Inertia::render('Projects/Show', [
            'project' => $project,
            ...$validations,
            'constraintUsage' => $usage->for($project),
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
            ->with('success', __('Project updated.'));
    }

    /** Favorito personal: el del dueño está en el proyecto; el de cada miembro, en su fila. */
    public function toggleFavorite(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('view', $project);

        $membership = $project->user_id === $request->user()->id
            ? null
            : ProjectMember::where('project_id', $project->id)->where('user_id', $request->user()->id)->firstOrFail();

        $membership
            ? $membership->update(['favorite' => ! $membership->favorite])
            : $project->update(['favorite' => ! $project->favorite]);

        return back();
    }

    public function destroy(Project $project): RedirectResponse
    {
        $this->authorize('delete', $project);

        $project->delete();

        return redirect()
            ->route('projects.index')
            ->with('success', __('Project deleted.'));
    }
}
