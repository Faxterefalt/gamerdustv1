<?php

namespace App\Http\Controllers;

use App\Models\DialogueNode;
use App\Models\Project;
use App\Models\Scene;
use App\Services\Emotion\EmotionalAnalysisService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EmotionalAnalysisController extends Controller
{
    public function index(Project $project): RedirectResponse
    {
        $this->authorize('view', $project);

        return redirect()->route('projects.show', $project);
    }

    public function store(Request $request, Project $project, EmotionalAnalysisService $service): RedirectResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'source_type' => ['required', Rule::in(['scene', 'dialogue'])],
            'source_id' => ['required', 'integer'],
        ]);

        $source = $this->resolveSource($project, $validated['source_type'], (int) $validated['source_id']);
        // Una escena se analiza con su resumen y el texto de su guion.
        $text = $source instanceof Scene ? trim(($source->summary ?? '')."\n".$source->scriptText()) : $source->text;

        abort_if(blank($text), 422, __('There is not enough text to analyze.'));

        $service->createFor($project, $source, $text);

        return back()->with('success', __('Simulated emotional analysis saved.'));
    }

    private function resolveSource(Project $project, string $type, int $id): Scene|DialogueNode
    {
        return match ($type) {
            'scene' => $project->scenes()->whereKey($id)->firstOrFail(),
            'dialogue' => $project->dialogueNodes()->whereKey($id)->firstOrFail(),
        };
    }
}
