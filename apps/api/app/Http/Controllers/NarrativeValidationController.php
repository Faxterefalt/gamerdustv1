<?php

namespace App\Http\Controllers;

use App\Models\NarrativeValidation;
use App\Models\Project;
use App\Services\Narrative\NarrativeValidationService;
use Illuminate\Http\RedirectResponse;

class NarrativeValidationController extends Controller
{
    public function index(Project $project, NarrativeValidationService $service): RedirectResponse
    {
        $this->authorize('view', $project);

        $service->run($project);

        return redirect()->route('projects.show', $project);
    }

    public function store(Project $project, NarrativeValidationService $service): RedirectResponse
    {
        $this->authorize('update', $project);

        $service->run($project);

        return back()->with('success', 'Validaciones narrativas actualizadas.');
    }

    public function update(Project $project, NarrativeValidation $validation): RedirectResponse
    {
        $this->authorize('update', $project);
        abort_unless($validation->project_id === $project->id, 404);

        $validation->update(['resolved' => true]);

        return back()->with('success', 'Validacion marcada como resuelta.');
    }
}
