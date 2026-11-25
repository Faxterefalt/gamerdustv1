<?php

namespace App\Http\Controllers;

use App\Http\Requests\AnalyzeSceneRequest;
use App\Models\Project;
use App\Models\Scene;
use App\Services\Emotion\SceneEmotionService;
use Illuminate\Http\JsonResponse;

/**
 * Análisis emocional de escenas desde el editor de guion (endpoints JSON).
 * La IA solo se invoca en `analyze`, cuando el usuario pulsa el botón.
 */
class SceneEmotionController extends Controller
{
    public function __construct(private readonly SceneEmotionService $emotions) {}

    /** Último análisis guardado (no llama a la IA). */
    public function show(Project $project, Scene $scene): JsonResponse
    {
        $this->authorize('view', $project);
        abort_unless($scene->project_id === $project->id, 404);

        return response()->json(['analysis' => $this->emotions->latest($scene)]);
    }

    public function analyze(AnalyzeSceneRequest $request, Project $project, Scene $scene): JsonResponse
    {
        return response()->json(['analysis' => $this->emotions->analyze($scene, $request->boolean('force'))]);
    }
}
