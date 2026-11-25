<?php

namespace App\Http\Controllers;

use App\Models\Mechanic;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MechanicController extends Controller
{
    public function index(Request $request, Project $project): Response
    {
        $this->authorize('view', $project);

        $mechanics = $project->mechanics()->with(['scenes:id', 'characters:id'])->orderBy('id')->get();
        $selected = $request->integer('mechanic');

        return Inertia::render('Mechanics/Index', [
            'project' => $project,
            'mechanics' => $mechanics->map->toPayload()->values(),
            'selected' => $mechanics->contains('id', $selected) ? $selected : null,
            'scenes' => $project->scenes()->orderBy('order')->orderBy('id')->get(['id', 'title', 'order']),
            'characters' => $project->characters()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $mechanic = $this->save($project->mechanics()->make(), $this->validated($request, $project));

        return $this->toMechanic($project, $mechanic)->with('success', __('Mechanic created.'));
    }

    public function update(Request $request, Project $project, Mechanic $mechanic): RedirectResponse
    {
        $this->ensureMechanic($project, $mechanic);

        $this->save($mechanic, $this->validated($request, $project));

        return $this->toMechanic($project, $mechanic)->with('success', __('Mechanic updated.'));
    }

    public function destroy(Project $project, Mechanic $mechanic): RedirectResponse
    {
        $this->ensureMechanic($project, $mechanic);

        $mechanic->delete();

        return redirect()->route('projects.mechanics.index', $project)->with('success', __('Mechanic deleted.'));
    }

    /**
     * Guarda la mecánica y sincroniza sus vínculos en una sola transacción.
     */
    private function save(Mechanic $mechanic, array $data): Mechanic
    {
        return DB::transaction(function () use ($mechanic, $data): Mechanic {
            $mechanic->fill(Arr::except($data, ['scene_ids', 'character_ids']))->save();
            $mechanic->scenes()->sync($data['scene_ids'] ?? []);
            $mechanic->characters()->sync($data['character_ids'] ?? []);

            return $mechanic;
        });
    }

    private function toMechanic(Project $project, Mechanic $mechanic): RedirectResponse
    {
        return redirect()->route('projects.mechanics.index', [$project, 'mechanic' => $mechanic->id]);
    }

    private function validated(Request $request, Project $project): array
    {
        // Las escenas y personajes deben pertenecer al mismo proyecto que la mecánica.
        $inProject = fn (string $table) => Rule::exists($table, 'id')->where('project_id', $project->id);

        return $request->validate([
            'title' => ['required', 'string', 'max:100'],
            'kind' => ['required', Rule::in(Mechanic::KINDS)],
            'icon' => ['required', Rule::in(Mechanic::ICONS)],
            'description' => ['required', 'string', 'max:2000'],
            'activation' => ['nullable', 'string', 'max:300'],
            'narrative_effect' => ['nullable', 'string', 'max:1000'],
            'playable_actions' => ['nullable', 'string', 'max:3000'],
            'restrictions' => ['nullable', 'string', 'max:3000'],
            'conflict' => ['nullable', 'string', 'max:500'],
            'scene_ids' => ['nullable', 'array', 'max:100'],
            'scene_ids.*' => ['integer', 'distinct', $inProject('scenes')],
            'character_ids' => ['nullable', 'array', 'max:100'],
            'character_ids.*' => ['integer', 'distinct', $inProject('characters')],
        ]);
    }

    private function ensureMechanic(Project $project, Mechanic $mechanic): void
    {
        $this->authorize('update', $project);
        abort_unless($mechanic->project_id === $project->id, 404);
    }
}
