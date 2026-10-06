<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreLoreEntryRequest;
use App\Models\LoreEntry;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class LoreEntryController extends Controller
{
    public function index(Project $project): Response
    {
        $this->authorize('view', $project);

        return Inertia::render('Lore/Index', [
            'project' => $project,
            'loreEntries' => $project->loreEntries()->latest()->paginate(15),
        ]);
    }

    public function create(Project $project): Response
    {
        $this->authorize('update', $project);

        return Inertia::render('Lore/Create', [
            'project' => $project,
        ]);
    }

    public function store(StoreLoreEntryRequest $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $project->loreEntries()->create($request->validated());

        return redirect()
            ->route('projects.lore.index', $project)
            ->with('success', 'Entrada de lore creada.');
    }

    public function edit(Project $project, LoreEntry $loreEntry): Response
    {
        $this->authorizeLore($project, $loreEntry);

        return Inertia::render('Lore/Edit', [
            'project' => $project,
            'loreEntry' => $loreEntry,
        ]);
    }

    public function update(StoreLoreEntryRequest $request, Project $project, LoreEntry $loreEntry): RedirectResponse
    {
        $this->authorizeLore($project, $loreEntry);

        $loreEntry->update($request->validated());

        return redirect()
            ->route('projects.lore.index', $project)
            ->with('success', 'Entrada de lore actualizada.');
    }

    public function destroy(Project $project, LoreEntry $loreEntry): RedirectResponse
    {
        $this->authorizeLore($project, $loreEntry);

        $loreEntry->delete();

        return back()->with('success', 'Entrada de lore eliminada.');
    }

    private function authorizeLore(Project $project, LoreEntry $loreEntry): void
    {
        $this->authorize('update', $project);
        abort_unless($loreEntry->project_id === $project->id, 404);
    }
}
