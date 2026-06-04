<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDialogueNodeRequest;
use App\Models\DialogueNode;
use App\Models\Project;
use App\Services\Cost\NarrativeCostEstimatorService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class DialogueNodeController extends Controller
{
    public function index(Project $project): Response
    {
        $this->authorize('view', $project);

        return Inertia::render('Dialogues/Index', [
            'project' => $project,
            'dialogues' => $project->dialogueNodes()
                ->with(['scene:id,title', 'character:id,name', 'options.nextDialogueNode:id,node_key'])
                ->latest()
                ->paginate(20),
        ]);
    }

    public function create(Project $project): Response
    {
        $this->authorize('update', $project);

        return Inertia::render('Dialogues/Create', [
            'project' => $project,
            'scenes' => $project->scenes()->get(['id', 'title']),
            'characters' => $project->characters()->get(['id', 'name']),
            'dialogues' => $project->dialogueNodes()->get(['id', 'node_key']),
        ]);
    }

    public function store(StoreDialogueNodeRequest $request, Project $project, NarrativeCostEstimatorService $estimator): RedirectResponse
    {
        $this->authorize('update', $project);

        $dialogue = $project->dialogueNodes()->create($request->safe()->except('options'));
        $this->syncOptions($dialogue, $request->validated('options', []));
        $estimator->createFor($project, $dialogue);

        return redirect()
            ->route('projects.dialogues.index', $project)
            ->with('success', 'Nodo de dialogo creado.');
    }

    public function edit(Project $project, DialogueNode $dialogue): Response
    {
        $this->authorizeDialogue($project, $dialogue);

        return Inertia::render('Dialogues/Edit', [
            'project' => $project,
            'dialogue' => $dialogue->load('options'),
            'scenes' => $project->scenes()->get(['id', 'title']),
            'characters' => $project->characters()->get(['id', 'name']),
            'dialogues' => $project->dialogueNodes()->whereKeyNot($dialogue->id)->get(['id', 'node_key']),
        ]);
    }

    public function update(StoreDialogueNodeRequest $request, Project $project, DialogueNode $dialogue, NarrativeCostEstimatorService $estimator): RedirectResponse
    {
        $this->authorizeDialogue($project, $dialogue);

        $dialogue->update($request->safe()->except('options'));
        $this->syncOptions($dialogue, $request->validated('options', []));
        $estimator->createFor($project, $dialogue);

        return redirect()
            ->route('projects.dialogues.index', $project)
            ->with('success', 'Nodo de dialogo actualizado.');
    }

    public function destroy(Project $project, DialogueNode $dialogue): RedirectResponse
    {
        $this->authorizeDialogue($project, $dialogue);

        $dialogue->delete();

        return back()->with('success', 'Nodo de dialogo eliminado.');
    }

    private function syncOptions(DialogueNode $dialogue, array $options): void
    {
        $dialogue->options()->delete();

        foreach ($options as $option) {
            if (blank($option['player_option'] ?? null)) {
                continue;
            }

            $dialogue->options()->create($option);
        }
    }

    private function authorizeDialogue(Project $project, DialogueNode $dialogue): void
    {
        $this->authorize('update', $project);
        abort_unless($dialogue->project_id === $project->id, 404);
    }
}
