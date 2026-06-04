<?php

namespace App\Http\Controllers;

use App\Models\DialogueNode;
use App\Models\Project;
use App\Models\Scene;
use App\Services\Cost\NarrativeCostEstimatorService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CostEstimationController extends Controller
{
    public function index(Project $project): RedirectResponse
    {
        $this->authorize('view', $project);

        return redirect()->route('projects.show', $project);
    }

    public function store(Request $request, Project $project, NarrativeCostEstimatorService $estimator): RedirectResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'source_type' => ['required', Rule::in(['scene', 'dialogue'])],
            'source_id' => ['required', 'integer'],
        ]);

        $source = $this->resolveSource($project, $validated['source_type'], (int) $validated['source_id']);
        $cost = $estimator->createFor($project, $source);

        if ($source instanceof Scene) {
            $source->update(['estimated_cost' => $cost->cost_level]);
        }

        return back()->with('success', 'Estimacion de costo guardada.');
    }

    private function resolveSource(Project $project, string $type, int $id): Scene|DialogueNode
    {
        return match ($type) {
            'scene' => $project->scenes()->whereKey($id)->firstOrFail(),
            'dialogue' => $project->dialogueNodes()->whereKey($id)->firstOrFail(),
        };
    }
}
