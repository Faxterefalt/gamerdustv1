<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateNarrativeValidationRequest;
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

        return back()->with('success', __('Narrative validations updated.'));
    }

    public function update(UpdateNarrativeValidationRequest $request, Project $project, NarrativeValidation $validation): RedirectResponse
    {
        $status = $request->validated('status') ?? 'resolved';

        // Reabrir una alerta cuya causa ya desapareció no tiene efecto: la siguiente ejecución la limpia.
        $validation->update(['status' => $status]);

        return back()->with('success', match ($status) {
            'dismissed' => __('Validation dismissed.'),
            'pending' => __('Validation reopened.'),
            default => __('Validation marked as resolved.'),
        });
    }
}
