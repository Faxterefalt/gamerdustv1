<?php

namespace App\Http\Controllers;

use App\Models\Mechanic;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MechanicController extends Controller
{
    public function index(Project $project): Response
    {
        $this->authorize('view', $project);

        return Inertia::render('Mechanics/Index', [
            'project' => $project,
            'mechanics' => $project->mechanics()->latest('id')->get(),
        ]);
    }

    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $project->mechanics()->create($this->validated($request));

        return back()->with('success', __('Mechanic created.'));
    }

    public function update(Request $request, Project $project, Mechanic $mechanic): RedirectResponse
    {
        $this->ensureMechanic($project, $mechanic);

        $mechanic->update($this->validated($request));

        return back()->with('success', __('Mechanic updated.'));
    }

    public function destroy(Project $project, Mechanic $mechanic): RedirectResponse
    {
        $this->ensureMechanic($project, $mechanic);

        $mechanic->delete();

        return back()->with('success', __('Mechanic deleted.'));
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:100'],
            'kind' => ['required', Rule::in(Mechanic::KINDS)],
            'description' => ['nullable', 'string', 'max:2000'],
            'activation' => ['nullable', 'string', 'max:300'],
            'narrative_effect' => ['nullable', 'string', 'max:1000'],
        ]);
    }

    private function ensureMechanic(Project $project, Mechanic $mechanic): void
    {
        $this->authorize('update', $project);
        abort_unless($mechanic->project_id === $project->id, 404);
    }
}
