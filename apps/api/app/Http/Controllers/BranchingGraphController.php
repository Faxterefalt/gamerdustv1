<?php

namespace App\Http\Controllers;

use App\Http\Requests\Branching\StoreBranchingNodeRequest;
use App\Http\Requests\Branching\StoreBranchingOptionRequest;
use App\Http\Requests\Branching\StoreBranchingVariableRequest;
use App\Http\Requests\Branching\UpdateBranchingNodeRequest;
use App\Http\Requests\Branching\UpdateBranchingOptionRequest;
use App\Http\Requests\Branching\UpdateBranchingVariableRequest;
use App\Http\Requests\Branching\UpdateNodePositionsRequest;
use App\Http\Resources\BranchingGraphResource;
use App\Models\BranchingVariable;
use App\Models\DialogueNode;
use App\Models\DialogueOption;
use App\Models\Project;
use App\Services\Branching\BranchingContextService;
use App\Services\Branching\BranchingNodeService;
use App\Services\Branching\BranchingVariableService;
use App\Services\Branching\DialoguePlayerView;
use App\Services\Cost\NarrativeCostEstimatorService;
use App\Services\Emotion\EmotionalAnalysisService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class BranchingGraphController extends Controller
{
    public function __construct(private readonly BranchingNodeService $nodes) {}

    public function index(Request $request, Project $project): Response
    {
        $this->authorize('view', $project);

        return Inertia::render('Branching/Index', [
            'project' => $project->only(['id', 'title']),
            'graph' => (new BranchingGraphResource($project))->resolve($request),
            'selectedNodeId' => $request->integer('node') ?: null,
        ]);
    }

    public function graph(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return response()->json($this->graphPayload($request, $project));
    }

    public function storeNode(StoreBranchingNodeRequest $request, Project $project, NarrativeCostEstimatorService $estimator): JsonResponse
    {
        $result = $this->nodes->create($project, $request->validated());
        $estimator->createFor($project, $result['node']);

        return response()->json([
            'node_id' => $result['node']->id,
            'sync' => $result['sync'],
            'graph' => $this->graphPayload($request, $project),
        ], 201);
    }

    public function updateNode(UpdateBranchingNodeRequest $request, Project $project, DialogueNode $node): JsonResponse
    {
        $this->ensureNode($project, $node);

        $result = $this->nodes->update($node, $request->validated());

        return response()->json([
            'node_id' => $node->id,
            'sync' => $result['sync'],
            'renamed' => $result['renamed'],
            'graph' => $this->graphPayload($request, $project),
        ]);
    }

    public function destroyNode(Request $request, Project $project, DialogueNode $node): JsonResponse
    {
        $this->authorize('update', $project);
        $this->ensureNode($project, $node);

        $affected = $this->nodes->delete($node);

        return response()->json(['broken_options' => $affected, 'graph' => $this->graphPayload($request, $project)]);
    }

    public function positions(UpdateNodePositionsRequest $request, Project $project): JsonResponse
    {
        $updated = $this->nodes->savePositions($project, $request->validated('positions'));

        return response()->json(['updated' => $updated]);
    }

    public function storeOption(StoreBranchingOptionRequest $request, Project $project, DialogueNode $node): JsonResponse
    {
        $this->ensureNode($project, $node);

        $option = $this->nodes->createOption($node, $request->validated());

        return response()->json(['option_id' => $option->id, 'graph' => $this->graphPayload($request, $project)], 201);
    }

    public function updateOption(UpdateBranchingOptionRequest $request, Project $project, DialogueOption $option): JsonResponse
    {
        $this->ensureOption($project, $option);

        $this->nodes->updateOption($option, $request->validated());

        return response()->json(['option_id' => $option->id, 'graph' => $this->graphPayload($request, $project)]);
    }

    public function destroyOption(Request $request, Project $project, DialogueOption $option): JsonResponse
    {
        $this->authorize('update', $project);
        $this->ensureOption($project, $option);

        $this->nodes->deleteOption($option);

        return response()->json(['graph' => $this->graphPayload($request, $project)]);
    }

    public function storeVariable(StoreBranchingVariableRequest $request, Project $project, BranchingVariableService $variables): JsonResponse
    {
        $variable = $variables->create($project, $request->validated());

        return response()->json(['variable_id' => $variable->id, 'graph' => $this->graphPayload($request, $project)], 201);
    }

    public function updateVariable(UpdateBranchingVariableRequest $request, Project $project, BranchingVariable $variable, BranchingVariableService $variables): JsonResponse
    {
        $rewritten = $variables->update($variable, $request->validated());

        return response()->json(['variable_id' => $variable->id, 'rewritten_options' => $rewritten, 'graph' => $this->graphPayload($request, $project)]);
    }

    public function destroyVariable(Request $request, Project $project, BranchingVariable $variable, BranchingVariableService $variables): JsonResponse
    {
        $this->authorize('update', $project);
        abort_unless($variable->project_id === $project->id, 404);

        $variables->delete($variable);

        return response()->json(['graph' => $this->graphPayload($request, $project)]);
    }

    /**
     * "Probar recorrido": el mismo reproductor que la exportación HTML, en el navegador.
     * Solo lectura: las variables viven en la página y nunca se escribe en la BD.
     */
    public function playtest(Request $request, Project $project, DialoguePlayerView $player): HttpResponse
    {
        $this->authorize('view', $project);

        $start = $request->integer('node') ?: null;
        $start = $start && $project->dialogueNodes()->whereKey($start)->exists() ? $start : null;

        return response($player->render($request, $project, playtest: true, startNodeId: $start))
            ->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('Cache-Control', 'no-store');
    }

    public function context(Project $project, DialogueNode $node, BranchingContextService $context): JsonResponse
    {
        $this->authorize('view', $project);
        $this->ensureNode($project, $node);

        return response()->json([
            'context' => $context->forNode($node),
            'analyses' => $node->emotionalAnalyses()->limit(3)->get(),
        ]);
    }

    /**
     * Ejecuta el análisis emocional existente y lo guarda en emotional_analyses.
     * Nunca modifica texto, opciones ni conexiones: el resultado es solo una sugerencia revisable.
     */
    public function analyze(Project $project, DialogueNode $node, EmotionalAnalysisService $service, BranchingContextService $context): JsonResponse
    {
        $this->authorize('update', $project);
        $this->ensureNode($project, $node);

        abort_if(blank($node->text), 422, __('There is not enough text to analyze.'));

        $analysis = $service->createFor($project, $node, $node->text);

        return response()->json(['analysis' => $analysis, 'context' => $context->forNode($node)]);
    }

    private function graphPayload(Request $request, Project $project): array
    {
        return (new BranchingGraphResource($project))->resolve($request);
    }

    private function ensureNode(Project $project, DialogueNode $node): void
    {
        abort_unless($node->project_id === $project->id, 404);
    }

    private function ensureOption(Project $project, DialogueOption $option): void
    {
        abort_unless($option->dialogueNode()->where('project_id', $project->id)->exists(), 404);
    }
}
