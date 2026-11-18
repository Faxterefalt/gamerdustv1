<?php

namespace App\Http\Controllers;

use App\Http\Requests\AiFeedbackRequest;
use App\Http\Requests\CharacterDraftRequest;
use App\Http\Requests\ProjectAiRequest;
use App\Http\Requests\RefineBlockRequest;
use App\Models\AiFeedback;
use App\Models\Project;
use App\Models\Scene;
use App\Services\Ai\AiUnavailableException;
use App\Services\Assist\BlockRefineService;
use App\Services\Assist\CharacterDraftService;
use App\Services\Assist\ConsequenceReviewService;
use App\Services\Assist\LudonarrativeReviewService;
use App\Support\OpsLog;
use Illuminate\Http\JsonResponse;

/**
 * Asistencia con IA (endpoints JSON): generar borradores, refinar bloques y valorar propuestas.
 * Generar y refinar nunca guardan nada: el autor revisa y decide.
 */
class AiAssistController extends Controller
{
    public function characterDraft(CharacterDraftRequest $request, Project $project, CharacterDraftService $drafts): JsonResponse
    {
        try {
            return response()->json($drafts->generate($project, $request->validated('idea'), $request->user()->id));
        } catch (AiUnavailableException $exception) {
            return $this->busy($exception);
        }
    }

    public function refine(RefineBlockRequest $request, Project $project, Scene $scene, BlockRefineService $refiner): JsonResponse
    {
        $data = $request->validated();
        $character = filled($data['character_id'] ?? null) ? $project->characters()->find($data['character_id']) : null;

        try {
            return response()->json($refiner->refine($scene, $data['block'], $data['goal'], $character, $data['instruction'] ?? null, $request->user()->id));
        } catch (AiUnavailableException $exception) {
            return $this->busy($exception);
        }
    }

    /** "Revisar consecuencias" del editor de ramificación (HU 50). Solo lee el grafo. */
    public function consequenceReview(ProjectAiRequest $request, Project $project, ConsequenceReviewService $reviews): JsonResponse
    {
        try {
            return response()->json($reviews->review($project, $request->user()->id));
        } catch (AiUnavailableException $exception) {
            return $this->busy($exception);
        }
    }

    /** "Detectar disonancias" de Mecánicas (HU 56). Solo lee mecánicas y sus vínculos. */
    public function ludonarrativeReview(ProjectAiRequest $request, Project $project, LudonarrativeReviewService $reviews): JsonResponse
    {
        try {
            return response()->json($reviews->review($project, $request->user()->id));
        } catch (AiUnavailableException $exception) {
            return $this->busy($exception);
        }
    }

    /** Guarda o cambia el voto del autor (uno por propuesta). */
    public function feedback(AiFeedbackRequest $request, Project $project): JsonResponse
    {
        $data = $request->validated();

        $feedback = AiFeedback::updateOrCreate(
            [
                'project_id' => $project->id,
                'user_id' => $request->user()->id,
                'emotional_analysis_id' => $data['emotional_analysis_id'] ?? null,
                'ai_generation_id' => $data['ai_generation_id'] ?? null,
                'item_index' => $data['item_index'],
            ],
            ['useful' => $data['useful']],
        );

        return response()->json(['feedback' => $feedback->only(['id', 'item_index', 'useful'])]);
    }

    /** Sin degradación a palabras clave: un aviso amable y la edición sigue. */
    private function busy(AiUnavailableException $exception): JsonResponse
    {
        // La respuesta llegó pero no pasó la validación en PHP (los fallos de red ya los registra GroqClient).
        if ($exception->getMessage() === 'invalid_output') {
            OpsLog::ai('invalid_output', ['generation_id' => $exception->generationId, 'user_id' => auth()->id()]);
        }

        $message = $exception->getMessage() === 'groq_not_configured'
            ? __('The AI connection is not configured.')
            : __('AI is busy, try again in a minute');

        return response()->json(['message' => $message], 503);
    }
}
