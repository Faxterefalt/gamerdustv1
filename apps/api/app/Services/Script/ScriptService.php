<?php

namespace App\Services\Script;

use App\Models\Project;
use App\Models\Scene;
use App\Models\SceneVersion;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Guion por escena: bloques ordenados (encabezado, acción, personaje, diálogo, acotación),
 * personajes/ubicación vinculados e historial de versiones.
 */
class ScriptService
{
    public const KINDS = ['heading', 'action', 'character', 'dialogue', 'parenthetical'];

    /** Versiones que se conservan por escena. */
    public const MAX_VERSIONS = 30;

    public function createScene(Project $project, string $title, string $act, ?int $userId): Scene
    {
        return DB::transaction(function () use ($project, $title, $act, $userId) {
            $scene = $project->scenes()->create([
                'title' => $title,
                'act' => $act,
                'order' => (int) $project->scenes()->max('order') + 1,
                'script' => [[
                    'id' => (string) Str::uuid(),
                    'kind' => 'heading',
                    'text' => __('EXT. :place - DAY', ['place' => Str::upper($title)]),
                ]],
            ]);

            $this->recordVersion($scene, $userId);

            return $scene;
        });
    }

    /**
     * @param  array<int, array{id: string, kind: string, text?: string|null}>  $elements
     * @param  array<int, int>  $characterIds  ya validados como personajes del proyecto
     */
    public function save(Scene $scene, array $elements, array $characterIds, ?int $locationId, ?int $userId): Scene
    {
        return DB::transaction(function () use ($scene, $elements, $characterIds, $locationId, $userId) {
            $scene->fill([
                'script' => $this->normalize($elements),
                'location_id' => $locationId,
            ]);
            // Siempre se marca el guardado: updated_at es el token de concurrencia del editor.
            $scene->updated_at = now();
            $scene->save();
            $scene->characters()->sync(array_values(array_unique($characterIds)));

            $this->recordVersion($scene, $userId);

            return $scene->refresh();
        });
    }

    /**
     * Restaura el contenido de una versión (no el título ni el acto). Las referencias que ya no existen se descartan.
     */
    public function restore(Scene $scene, SceneVersion $version, ?int $userId): Scene
    {
        $project = $scene->project;
        $characters = $project->characters()->whereIn('id', $version->character_ids ?? [])->pluck('id')->all();
        $location = $version->location_id && $project->loreEntries()->whereKey($version->location_id)->exists()
            ? $version->location_id
            : null;

        return $this->save($scene, $version->script ?? [], $characters, $location, $userId);
    }

    public function present(Scene $scene): array
    {
        return [
            'id' => $scene->id,
            'title' => $scene->title,
            'act' => $scene->act,
            'order' => $scene->order,
            'script' => $scene->script ?? [],
            'character_ids' => $scene->relationLoaded('characters')
                ? $scene->characters->pluck('id')->all()
                : $scene->characters()->pluck('characters.id')->all(),
            'location_id' => $scene->location_id,
            'updated_at' => $scene->updated_at?->toJSON(),
        ];
    }

    private function recordVersion(Scene $scene, ?int $userId): void
    {
        $scene->versions()->create([
            'user_id' => $userId,
            'title' => $scene->title,
            'script' => $scene->script ?? [],
            'character_ids' => $scene->characters()->pluck('characters.id')->all(),
            'location_id' => $scene->location_id,
        ]);

        $keep = $scene->versions()->limit(self::MAX_VERSIONS)->pluck('id');
        $scene->versions()->whereNotIn('id', $keep)->delete();
    }

    private function normalize(array $elements): array
    {
        return array_values(array_map(fn (array $element) => [
            'id' => (string) $element['id'],
            'kind' => $element['kind'],
            'text' => (string) ($element['text'] ?? ''),
        ], $elements));
    }
}
