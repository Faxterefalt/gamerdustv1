<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Scene;
use App\Services\Narrative\NarrativeValidationService;
use App\Services\Script\ScriptService;
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
    public function bible(Project $project): Response
    {
        $this->authorize('view', $project);

        return Inertia::render('Bible/Index', [
            'project' => $project->load('constraint'),
            'characters' => $project->characters()->orderBy('name')->get(['id', 'project_id', 'name', 'role', 'motivation', 'background']),
            'locations' => $project->loreEntries()->where('type', 'location')->orderBy('title')->get(['id', 'project_id', 'title', 'description']),
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
            'dialogues' => $project->dialogueNodes()->orderBy('id')->get(['id', 'node_key', 'title']),
            'analysis' => $project->emotionalAnalyses()->first(),
            'validations' => $project->narrativeValidations()->where('resolved', false)->get(),
            'initialSceneId' => $request->integer('scene') ?: null,
        ]);
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
            ],
        ]);
    }

    /**
     * Biblia narrativa + guion completo en Markdown.
     */
    public function markdown(Project $project): StreamedResponse
    {
        $this->authorize('view', $project);

        $project->load(['constraint', 'characters', 'mechanics']);
        $none = __('Not defined.');
        $locations = $project->loreEntries()->where('type', 'location')->orderBy('title')->get();
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
            ...$locations->map(fn ($location) => "- {$location->title}: ".($location->description ?: '')),
            '',
            '## '.__('Mechanics'),
        ];

        foreach ($project->mechanics as $mechanic) {
            array_push(
                $lines,
                "### {$mechanic->title}",
                $mechanic->description ?: '',
                __('Activation').': '.($mechanic->activation ?: ''),
                __('Narrative consequence').': '.($mechanic->narrative_effect ?: ''),
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
}
