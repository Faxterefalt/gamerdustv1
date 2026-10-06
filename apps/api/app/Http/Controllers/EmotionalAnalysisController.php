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
        $text = $source instanceof Scene ? ($source->summary ?? '') : $source->text;

        abort_if(blank($text), 422, 'No hay texto suficiente para analizar.');

        $service->createFor($project, $source, $text);

        return back()->with('success', 'Analisis emocional simulado guardado.');
    }

    private function resolveSource(Project $project, string $type, int $id): Scene|DialogueNode
    {
        return match ($type) {
            'scene' => $project->scenes()->whereKey($id)->firstOrFail(),
            'dialogue' => $project->dialogueNodes()->whereKey($id)->firstOrFail(),
        };
    }
}
