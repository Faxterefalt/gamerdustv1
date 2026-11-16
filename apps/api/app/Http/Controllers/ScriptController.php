<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Scene;
use App\Models\SceneVersion;
use App\Services\Cost\NarrativeCostEstimatorService;
use App\Services\Script\ScriptService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\View\View;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Editor de guion. `index` es una página Inertia; el resto son endpoints JSON (como el editor de ramificación).
 */
class ScriptController extends Controller
{
    public function __construct(private readonly ScriptService $script) {}

    public function index(Request $request, Project $project): Response
    {
        $this->authorize('view', $project);

        return Inertia::render('Script/Index', [
            'project' => $project,
            'scenes' => $project->scenes()->with('characters:id')->get()->map(fn (Scene $scene) => $this->script->present($scene)),
            'characters' => $project->characters()->orderBy('name')->get(['id', 'name']),
            'locations' => $project->loreEntries()->where('type', 'location')->orderBy('title')->get(['id', 'title']),
            'comments' => fn () => $project->comments()->with(['user:id,name', 'scene:id,title'])->get()->map->toPayload(),
            'initialSceneId' => $request->integer('scene') ?: null,
        ]);
    }

    public function storeScene(Request $request, Project $project, NarrativeCostEstimatorService $estimator): JsonResponse
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'act' => ['required', 'string', 'max:100'],
        ]);

        $scene = $this->script->createScene($project, $data['title'], $data['act'], $request->user()?->id);
        $scene->update(['estimated_cost' => $estimator->createFor($project, $scene)->cost_level]);

        return response()->json(['scene' => $this->script->present($scene->refresh())], 201);
    }

    public function updateScene(Request $request, Project $project, Scene $scene): JsonResponse
    {
        $this->ensureScene($project, $scene);

        $data = $request->validate([
            'updated_at' => ['nullable', 'string'],
            'elements' => ['present', 'array', 'max:500'],
            'elements.*.id' => ['required', 'string', 'max:64'],
            'elements.*.kind' => ['required', Rule::in(ScriptService::KINDS)],
            'elements.*.text' => ['nullable', 'string', 'max:10000'],
            'characters' => ['present', 'array'],
            'characters.*' => ['integer', 'distinct', Rule::exists('characters', 'id')->where('project_id', $project->id)],
            'location_id' => ['nullable', 'integer', Rule::exists('lore_entries', 'id')->where('project_id', $project->id)],
        ]);

        // Si la escena cambió desde que se cargó el editor (otra pestaña, el formulario clásico...), no se pisa.
        if (filled($data['updated_at'] ?? null) && $data['updated_at'] !== $scene->updated_at?->toJSON()) {
            return response()->json(['message' => __('This scene was changed elsewhere. Reload the page to get the latest version before saving.')], 409);
        }

        $scene = $this->script->save($scene, $data['elements'], $data['characters'], $data['location_id'] ?? null, $request->user()?->id);

        return response()->json(['scene' => $this->script->present($scene)]);
    }

    public function versions(Project $project, Scene $scene): JsonResponse
    {
        $this->ensureScene($project, $scene, 'view');

        return response()->json([
            'versions' => $scene->versions()->with('user:id,name')->get()->map(fn (SceneVersion $version) => [
                'id' => $version->id,
                'title' => $version->title,
                'script' => $version->script ?? [],
                'author' => $version->user?->name,
                'created_at' => $version->created_at?->toJSON(),
            ]),
        ]);
    }

    public function restoreVersion(Request $request, Project $project, Scene $scene, SceneVersion $version): JsonResponse
    {
        $this->ensureScene($project, $scene);
        abort_unless($version->scene_id === $scene->id, 404);

        $scene = $this->script->restore($scene, $version, $request->user()?->id);

        return response()->json(['scene' => $this->script->present($scene)]);
    }

    /**
     * Guion completo con formato de guion, listo para imprimir o guardar como PDF desde el navegador.
     */
    public function print(Project $project): View
    {
        $this->authorize('view', $project);

        return view('script.print', [
            'project' => $project,
            'scenes' => $project->scenes()->with('location:id,title')->get(),
        ]);
    }

    private function ensureScene(Project $project, Scene $scene, string $ability = 'update'): void
    {
        $this->authorize($ability, $project);
        abort_unless($scene->project_id === $project->id, 404);
    }
}
