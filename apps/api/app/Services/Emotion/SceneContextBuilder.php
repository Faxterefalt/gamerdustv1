<?php

namespace App\Services\Emotion;

use App\Models\Character;
use App\Models\CharacterEmotionalState;
use App\Models\EmotionalAnalysis;
use App\Models\LoreEntry;
use App\Models\Project;
use App\Models\Scene;
use App\Services\Script\ScenePlainText;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Contexto de una escena para el análisis emocional: esencia del proyecto, lugar y reglas,
 * personajes vinculados (con sus reglas) y el estado emocional previo de cada uno.
 * Todo sale de los vínculos de la Biblia: character_scene, location_id, lore_entry_links
 * y character_lore_entry.
 */
class SceneContextBuilder
{
    public function __construct(
        private readonly ScenePlainText $text,
        private readonly EmotionTranslator $translator,
    ) {}

    public function build(Scene $scene): array
    {
        $project = $scene->project;
        $order = $this->sceneOrder($project);
        $position = $order->search($scene->id);
        $earlier = $order->take($position === false ? 0 : $position)->values();

        [$text, $truncated] = $this->text->limit($this->text->build($scene), (int) config('gamerdust.ai.max_scene_words', 1800));

        $characters = $this->characters($scene);
        $location = $scene->location;
        $rules = $this->rules($location, $characters);

        // Presupuesto: como máximo N elementos de contexto (primero personajes, luego lugar y reglas).
        $budget = (int) config('gamerdust.ai.max_context_items', 8);
        $characters = $characters->take($budget)->values();
        $budget -= $characters->count();
        $location = $budget > 0 ? $location : null;
        $budget -= $location ? 1 : 0;
        $rules = $rules->take(max(0, $budget))->values();

        return [
            'project' => [
                'title' => $project->title,
                'genre' => $project->game_genre,
                'language' => $project->language ?: 'es',
                'essence' => array_filter([
                    'premise' => $project->premise,
                    'central_conflict' => $project->central_conflict,
                    'central_theme' => $project->constraint?->central_theme,
                    'tone' => $project->constraint?->main_emotional_tone,
                    'setting' => $project->constraint?->setting,
                    'assignment' => $project->constraint?->assignment,
                ], 'filled'),
            ],
            'scene' => [
                'id' => $scene->id,
                'code' => $this->code($position),
                'title' => $scene->title,
                'act' => $scene->act,
                'text' => $text,
                'truncated' => $truncated,
            ],
            'location' => $location ? [
                'id' => $location->id,
                'title' => $location->title,
                'description' => $this->clip($location->description),
            ] : null,
            'rules' => $rules->map(fn (LoreEntry $rule) => [
                'id' => $rule->id,
                'title' => $rule->title,
                'rigidity' => $rule->rigidity,
                'statement' => $this->clip($rule->statement ?: $rule->description),
            ])->all(),
            'characters' => $characters->map(fn (Character $character) => [
                'id' => $character->id,
                'name' => $character->name,
                'role' => $character->role,
                'description' => $this->clip($character->background),
                'personality' => $this->clip($character->personality),
                'motivation' => $this->clip($character->motivation),
                'values' => $this->clip($character->values),
                'inner_conflict' => $this->clip($character->inner_conflict),
                'fear' => $this->clip($character->fear),
                'limits' => $this->clip($character->limits),
                'rules' => $character->loreEntries
                    ->where('type', 'rule')
                    ->map(fn (LoreEntry $rule) => ['id' => $rule->id, 'title' => $rule->title, 'role' => $rule->pivot->role])
                    ->values()->all(),
            ])->all(),
            'previous' => $this->previousStates($characters, $earlier, $order),
            'previous_scene' => $this->previousScene($earlier, $order),
        ];
    }

    /**
     * Hash del contenido analizado: texto, vínculos, fichas que entran en el contexto y locale.
     * Si coincide con el del último análisis, se reutiliza sin llamar a la IA.
     */
    public function contentHash(Scene $scene): string
    {
        $project = $scene->project;
        $characters = $this->characters($scene);
        $location = $scene->location;
        $rules = $this->rules($location, $characters);

        return hash('sha256', json_encode([
            'script' => $scene->script ?? [],
            'title' => $scene->title,
            'act' => $scene->act,
            'characters' => $characters->pluck('updated_at', 'id')->map(fn ($date) => $date?->toJSON())->sortKeys()->all(),
            'location' => [$scene->location_id, $location?->updated_at?->toJSON()],
            'rules' => $rules->pluck('updated_at', 'id')->map(fn ($date) => $date?->toJSON())->sortKeys()->all(),
            'project' => [$project->title, $project->game_genre, $project->language, $project->premise, $project->central_conflict],
            'constraint' => $project->constraint?->updated_at?->toJSON(),
            'locale' => app()->getLocale(),
        ]));
    }

    /** @return Collection<int, int> ids de escena en orden de guion */
    public function sceneOrder(Project $project): Collection
    {
        return $project->scenes()->reorder()->orderBy('order')->orderBy('id')->pluck('id')->values();
    }

    /** Código visible (E01, E02...): se calcula por orden, no se guarda. */
    public function code(int|false|null $position): ?string
    {
        return $position === false || $position === null ? null : 'E'.str_pad((string) ($position + 1), 2, '0', STR_PAD_LEFT);
    }

    /** @return Collection<int, Character> */
    private function characters(Scene $scene): Collection
    {
        return $scene->characters()->with('loreEntries')->orderBy('characters.id')->get();
    }

    /**
     * Reglas del lugar (lore_entry_links) y de los personajes (character_lore_entry), sin repetir.
     *
     * @return Collection<int, LoreEntry>
     */
    private function rules(?LoreEntry $location, Collection $characters): Collection
    {
        $fromLocation = $location ? $location->linkedEntries()->where('type', 'rule')->get() : collect();
        $fromCharacters = $characters->flatMap(fn (Character $character) => $character->loreEntries->where('type', 'rule'));

        return $fromLocation->concat($fromCharacters)->unique('id')->values();
    }

    /**
     * Estado previo de cada personaje: el de la escena anterior más cercana en la que la IA lo
     * analizó; si no hay, el estado inicial que eligió el autor; si tampoco, ninguno.
     *
     * @return array<int, array{origin: string, emotion: string|null, v: float|null, a: float|null, d: float|null, scene_id: int|null, code: string|null}>
     */
    private function previousStates(Collection $characters, Collection $earlier, Collection $order): array
    {
        $states = CharacterEmotionalState::query()
            ->whereIn('character_id', $characters->pluck('id'))
            ->whereIn('scene_id', $earlier)
            ->get()
            ->sortByDesc(fn (CharacterEmotionalState $state) => $order->search($state->scene_id))
            ->unique('character_id')
            ->keyBy('character_id');

        return $characters->mapWithKeys(function (Character $character) use ($states, $order) {
            if ($state = $states->get($character->id)) {
                return [$character->id => [
                    'origin' => 'ai',
                    'emotion' => $state->emotion,
                    ...$state->vad(),
                    'scene_id' => $state->scene_id,
                    'code' => $this->code($order->search($state->scene_id)),
                ]];
            }

            if ($vad = $this->translator->fromAuthor($character->initial_emotion, $character->initial_intensity)) {
                return [$character->id => ['origin' => 'author', 'emotion' => $character->initial_emotion, ...$vad, 'scene_id' => null, 'code' => null]];
            }

            return [$character->id => ['origin' => 'none', 'emotion' => null, 'v' => null, 'a' => null, 'd' => null, 'scene_id' => null, 'code' => null]];
        })->all();
    }

    /**
     * Último análisis (con IA o palabras clave, escala 0-1) de la escena anterior más cercana.
     */
    private function previousScene(Collection $earlier, Collection $order): ?array
    {
        $analysis = EmotionalAnalysis::query()
            ->where('analyzable_type', Scene::class)
            ->whereIn('analyzable_id', $earlier)
            ->whereNotNull('content_hash')
            ->latest('id')
            ->get()
            ->sortByDesc(fn (EmotionalAnalysis $item) => $order->search($item->analyzable_id))
            ->first();

        $scene = $analysis?->result['scene'] ?? null;

        if (! $scene) {
            return null;
        }

        return [
            'scene_id' => $analysis->analyzable_id,
            'code' => $this->code($order->search($analysis->analyzable_id)),
            'title' => Scene::whereKey($analysis->analyzable_id)->value('title'),
            'emotion' => $scene['emotion'],
            'v' => (float) $scene['v'],
            'a' => (float) $scene['a'],
            'd' => (float) $scene['d'],
        ];
    }

    private function clip(?string $value, int $limit = 300): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : Str::limit(preg_replace('/\s+/u', ' ', $value), $limit);
    }
}
