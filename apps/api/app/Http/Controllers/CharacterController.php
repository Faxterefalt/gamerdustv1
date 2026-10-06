<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCharacterRequest;
use App\Models\Character as NarrativeCharacter;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class CharacterController extends Controller
{
    public function index(Project $project): Response
    {
        $this->authorize('view', $project);

        return Inertia::render('Characters/Index', [
            'project' => $project,
            'characters' => $project->characters()->latest()->paginate(15),
        ]);
    }

    public function create(Project $project): Response
    {
        $this->authorize('update', $project);

        return Inertia::render('Characters/Create', [
            'project' => $project,
        ]);
    }

    public function store(StoreCharacterRequest $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $project->characters()->create($request->validated());

        return redirect()
            ->route('projects.characters.index', $project)
            ->with('success', 'Personaje creado.');
    }

    public function edit(Project $project, NarrativeCharacter $character): Response
    {
        $this->authorizeCharacter($project, $character);

        return Inertia::render('Characters/Edit', [
            'project' => $project,
            'character' => $character,
        ]);
    }

    public function update(StoreCharacterRequest $request, Project $project, NarrativeCharacter $character): RedirectResponse
    {
        $this->authorizeCharacter($project, $character);

        $character->update($request->validated());

        return redirect()
            ->route('projects.characters.index', $project)
            ->with('success', 'Personaje actualizado.');
    }

    public function destroy(Project $project, NarrativeCharacter $character): RedirectResponse
    {
        $this->authorizeCharacter($project, $character);

        $character->delete();

        return back()->with('success', 'Personaje eliminado.');
    }

    private function authorizeCharacter(Project $project, NarrativeCharacter $character): void
    {
        $this->authorize('update', $project);
        abort_unless($character->project_id === $project->id, 404);
    }
}
