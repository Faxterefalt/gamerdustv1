<?php

namespace App\Http\Controllers;

use App\Http\Resources\BranchingGraphResource;
use App\Models\Project;
use App\Models\Scene;
use App\Services\Emotion\EmotionTimelineService;
use App\Services\Emotion\EmotionTranslator;
use App\Services\Narrative\NarrativeValidationService;
use App\Services\Script\ScriptService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Secciones del estudio de proyecto (sidebar) que solo leen y combinan datos existentes.
 */
class StudioController extends Controller
{
    /** Claves de traducción de la rigidez de las reglas (exportación). */
    /** Claves de traducción de los tipos de diálogo (las mismas que `branching/layout.ts`). */
    private const DIALOGUE_TYPE_LABELS = [
        'cutscene' => 'Cutscene',
        'ambient' => 'Ambient',
        'bark' => 'Bark',
        'interactive_no_branch' => 'Interactive, no branches',
        'interactive_rubber_banding' => 'Interactive, rubber-banding',
        'interactive_alternative_paths' => 'Interactive, alternative paths',
    ];

    private const RIGIDITY_LABELS = ['unbreakable' => 'Unbreakable', 'costly' => 'Breakable at a cost', 'flexible' => 'Flexible'];

    public function bible(Project $project): Response
    {
        $this->authorize('view', $project);

        return Inertia::render('Bible/Index', [
            'project' => $project->load('constraint'),
            'characters' => $project->characters()->orderBy('name')->get(['id', 'project_id', 'name', 'role', 'motivation', 'background']),
            'locations' => $project->loreEntries()->where('type', 'location')->orderBy('title')->get(['id', 'project_id', 'title', 'description']),
            'rules' => $project->loreEntries()->where('type', 'rule')->orderBy('title')->get(['id', 'project_id', 'title', 'statement', 'description']),
            'loreCount' => $project->loreEntries()->count(),
        ]);
    }

    public function analysis(Request $request, Project $project, NarrativeValidationService $validations, ScriptService $script): Response
    {
        $this->authorize('view', $project);

        $validations->run($project);

        return Inertia::render('Analysis/Index', [
            'project' => $project,
            'scenes' => $project->scenes()->with('characters:id')->get()->map(fn (Scene $scene) => $script->present($scene)),
            'validations' => $project->narrativeValidations()->where('resolved', false)->get(),
            'initialSceneId' => $request->integer('scene') ?: null,
        ]);
    }

    /**
     * Evolución emocional (Vistas A y B). Los datos llegan por emotionTimeline (JSON).
     */
    public function evolution(Project $project, EmotionTranslator $emotions): Response
    {
        $this->authorize('view', $project);

        return Inertia::render('Analysis/Evolution', [
            'project' => $project,
            'emotionCatalog' => $emotions->catalog(),
        ]);
    }

    public function emotionTimeline(Project $project, EmotionTimelineService $timeline): JsonResponse
    {
        $this->authorize('view', $project);

        return response()->json($timeline->build($project));
    }

    public function collaboration(Project $project): Response
    {
        $this->authorize('view', $project);

        return Inertia::render('Collaboration/Index', [
            'project' => $project,
            'comments' => fn () => $project->comments()->with(['user:id,name', 'scene:id,title'])->get()->map->toPayload(),
        ]);
    }

    public function reports(Project $project): Response
    {
        $this->authorize('view', $project);

        return Inertia::render('Reports/Index', [
            'project' => $project,
            'counts' => [
                'scenes' => $project->scenes()->count(),
                'characters' => $project->characters()->count(),
                'locations' => $project->loreEntries()->where('type', 'location')->count(),
                'mechanics' => $project->mechanics()->count(),
                'dialogues' => $project->dialogueNodes()->count(),
            ],
        ]);
    }

    /**
     * Biblia narrativa + guion completo en Markdown.
     */
    public function markdown(Project $project): StreamedResponse
    {
        $this->authorize('view', $project);

        $project->load(['constraint', 'characters', 'mechanics.scenes', 'mechanics.characters']);
        $none = __('Not defined.');
        $locations = $project->loreEntries()->where('type', 'location')->with('parent:id,title')->orderBy('title')->get();
        $rules = $project->loreEntries()->where('type', 'rule')->with(['linkedEntries:id,title,type', 'characters:id,name'])->orderBy('title')->get();
        // Texto multilínea (una entrada por línea) como lista separada por comas.
        $inline = fn (?string $text) => collect(preg_split('/\R/u', $text ?? ''))->map(fn ($line) => trim($line))->filter()->implode(', ');
        $scenes = $project->scenes()->get();

        $lines = [
            "# {$project->title}",
            '',
            __('Genre').': '.($project->game_genre ? __($project->game_genre) : $none),
            __('Language').': '.__($project->language === 'en' ? 'English' : 'Spanish'),
            '',
            '## '.__('Premise'), $project->premise ?: $none, '',
            '## '.__('Central theme'), $project->constraint?->central_theme ?: $none, '',
            '## '.__('Setting'), $project->constraint?->setting ?: $none, '',
            '## '.__('Main conflict'), $project->central_conflict ?: $none, '',
            '## '.__('Characters'),
            ...$project->characters->map(fn ($character) => "- {$character->name}: ".($character->motivation ?: $character->background ?: '')),
            '',
            '## '.__('Locations'),
            ...$locations->map(fn ($location) => "- {$location->title}"
                .($location->parent ? ' ('.__('inside :place', ['place' => $location->parent->title]).')' : '')
                .': '.($location->description ?: '')
                .($location->narrative_function ? ' — '.$location->narrative_function : '')),
            '',
            '## '.__('World rules'),
        ];

        foreach ($rules as $rule) {
            array_push(
                $lines,
                "### {$rule->title}",
                $rule->statement ?: ($rule->description ?: ''),
                __('Rigidity').': '.($rule->rigidity ? __(self::RIGIDITY_LABELS[$rule->rigidity] ?? $rule->rigidity) : $none),
                __('Origin').': '.($rule->origin ?: ''),
                __('Consequence if broken').': '.($rule->consequence ?: ''),
                __('Exceptions').': '.($rule->exceptions ?: ''),
                __('Places where it applies').': '.($rule->scope === 'global' ? __('The whole world') : $rule->linkedEntries->where('type', 'location')->pluck('title')->implode(', ')),
                __('Characters').': '.$rule->characters->pluck('name')->implode(', '),
                '',
            );
        }

        $lines[] = '## '.__('Mechanics');

        foreach ($project->mechanics as $mechanic) {
            array_push(
                $lines,
                "### {$mechanic->title}",
                $mechanic->description ?: '',
                __('Activation').': '.($mechanic->activation ?: ''),
                __('Narrative consequence').': '.($mechanic->narrative_effect ?: ''),
                __('Playable actions').': '.$inline($mechanic->playable_actions),
                __('Restrictions').': '.$inline($mechanic->restrictions),
                __('Conflict').': '.($mechanic->conflict ?: ''),
                __('Scenes').': '.$mechanic->scenes->pluck('title')->implode(', '),
                __('Characters').': '.$mechanic->characters->pluck('name')->implode(', '),
                '',
            );
        }

        $lines[] = '## '.__('Script');

        foreach ($scenes as $index => $scene) {
            $lines[] = '### E'.str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT)." · {$scene->title}";
            if ($scene->act) {
                $lines[] = "_{$scene->act}_";
            }
            $lines[] = '';
            foreach ($scene->script ?? [] as $block) {
                $lines[] = $block['text'] ?? '';
            }
            $lines[] = '';
        }

        $lines[] = '---';
        $lines[] = __('Exported from GAMERDUST.');

        return response()->streamDownload(
            fn () => print (implode("\n", $lines)),
            Str::slug($project->title ?: 'project').'-'.Str::slug(__('world')).'.md',
            ['Content-Type' => 'text/markdown; charset=UTF-8'],
        );
    }

    /**
     * Diálogos ramificados en un HTML autónomo (sin red) al estilo Twine: mapa de nodos y modo lectura.
     */
    public function dialogues(Request $request, Project $project): StreamedResponse
    {
        $this->authorize('view', $project);

        $html = view('reports.dialogues', [
            'project' => $project,
            'graph' => (new BranchingGraphResource($project))->resolve($request),
            'typeLabels' => array_map(fn (string $label) => __($label), self::DIALOGUE_TYPE_LABELS),
        ])->render();

        return response()->streamDownload(
            fn () => print ($html),
            Str::slug($project->title ?: 'project').'-'.Str::slug(__('dialogues')).'.html',
            ['Content-Type' => 'text/html; charset=UTF-8'],
        );
    }
}
