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
            ->with('success', __('Dialogue node created.'));
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

        $attributes = $request->safe()->except('options');

        // Sin título propio, node_key es el título efectivo: se fija para no romper las {{referencias}} existentes.
        if (blank($dialogue->title) && $attributes['node_key'] !== $dialogue->node_key) {
            $attributes['title'] = $dialogue->node_key;
        }

        $dialogue->update($attributes);
        $this->syncOptions($dialogue, $request->validated('options', []));
        $estimator->createFor($project, $dialogue);

        return redirect()
            ->route('projects.dialogues.index', $project)
            ->with('success', __('Dialogue node updated.'));
    }

    public function destroy(Project $project, DialogueNode $dialogue): RedirectResponse
    {
        $this->authorizeDialogue($project, $dialogue);

        $dialogue->delete();

        return back()->with('success', __('Dialogue node deleted.'));
    }

    private function syncOptions(DialogueNode $dialogue, array $options): void
    {
        // El formulario reenvía todas las opciones sin id. Al emparejarlas con las anteriores (mismo texto y
        // destino) se conservan el marcador de las administradas por {{ }} y la condición y los efectos,
        // que este formulario no edita.
        $previous = $dialogue->options()->orderBy('id')->get();

        $dialogue->options()->delete();

        foreach ($options as $option) {
            if (blank($option['player_option'] ?? null)) {
                continue;
            }

            $match = $previous->first(fn ($old) => $old->next_dialogue_node_id == ($option['next_dialogue_node_id'] ?? null)
                && $old->player_option === $option['player_option']);

            if ($match) {
                $previous = $previous->reject(fn ($old) => $old->id === $match->id);
                $option['source_ref'] = $match->source_ref;
                $option['condition'] = $match->condition;
                $option['effects'] = $match->effects;
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
