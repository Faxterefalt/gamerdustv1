<?php

namespace App\Http\Controllers;

use App\Models\LoreEntry;
use App\Models\Project;
use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Fichas de la Biblia Narrativa: lugares y reglas del mundo (entradas de lore de tipo
 * "location" y "rule") y sus vínculos con escenas, personajes, lore y mecánicas.
 */
class BibleEntryController extends Controller
{
    /** Pestaña de la URL => tipo de entrada de lore. */
    public const KINDS = ['locations' => 'location', 'rules' => 'rule'];

    /** Campos de vínculos (no son columnas de lore_entries). */
    private const LINKS = ['characters', 'scene_ids', 'location_ids', 'rule_ids', 'lore_ids', 'mechanic_ids'];

    public function index(Request $request, Project $project, string $kind): Response
    {
        $this->authorize('view', $project);
        $type = self::KINDS[$kind];

        $entries = $project->loreEntries()
            ->where('type', $type)
            ->with(['characters:id', 'scenes:id', 'locatedScenes:id,location_id', 'mechanics:id', 'linkedEntries:id,type'])
            ->orderBy('title')
            ->get();
        $selected = $request->integer('entry');

        return Inertia::render($kind === 'locations' ? 'Bible/Locations' : 'Bible/Rules', [
            'project' => $project,
            'entries' => $entries->map->toBiblePayload()->values(),
            'selected' => $entries->contains('id', $selected) ? $selected : null,
            'scenes' => $project->scenes()->orderBy('order')->orderBy('id')->get(['id', 'title', 'order', 'location_id']),
            'characters' => $project->characters()->orderBy('name')->get(['id', 'name']),
            // El resto de entradas de lore, para vincular (reglas, lugares, facciones...).
            'lore' => $project->loreEntries()->where('type', '!=', $type)->orderBy('title')->get(['id', 'title', 'type']),
            'mechanics' => $project->mechanics()->orderBy('title')->get(['id', 'title']),
        ]);
    }

    public function store(Request $request, Project $project, string $kind): RedirectResponse
    {
        $this->authorize('update', $project);

        $entry = $project->loreEntries()->make(['type' => self::KINDS[$kind]]);
        $this->save($project, $entry, $this->validated($request, $project, $entry));

        return $this->toEntry($project, $kind, $entry)->with('success', $kind === 'locations' ? __('Place created.') : __('Rule created.'));
    }

    public function update(Request $request, Project $project, string $kind, LoreEntry $loreEntry): RedirectResponse
    {
        $this->ensureEntry($project, $kind, $loreEntry);

        $this->save($project, $loreEntry, $this->validated($request, $project, $loreEntry));

        return $this->toEntry($project, $kind, $loreEntry)->with('success', $kind === 'locations' ? __('Place updated.') : __('Rule updated.'));
    }

    public function destroy(Project $project, string $kind, LoreEntry $loreEntry): RedirectResponse
    {
        $this->ensureEntry($project, $kind, $loreEntry);

        $loreEntry->delete();

        return redirect()
            ->route('projects.bible.index', [$project, $kind])
            ->with('success', $kind === 'locations' ? __('Place deleted.') : __('Rule deleted.'));
    }

    /**
     * Guarda la ficha y sus vínculos en una transacción.
     */
    private function save(Project $project, LoreEntry $entry, array $data): void
    {
        DB::transaction(function () use ($project, $entry, $data): void {
            $entry->fill(Arr::except($data, self::LINKS))->save();
            $isLocation = $entry->type === 'location';

            $entry->characters()->sync(
                collect($data['characters'] ?? [])
                    ->mapWithKeys(fn (array $link) => [(int) $link['id'] => ['role' => $isLocation ? null : ($link['role'] ?? null)]])
                    ->all()
            );

            if ($isLocation) {
                // Un lugar es la ubicación de sus escenas: vincular una escena cambia su location_id.
                $sceneIds = $data['scene_ids'] ?? [];
                $project->scenes()->where('location_id', $entry->id)->whereNotIn('id', $sceneIds)->update(['location_id' => null]);
                $project->scenes()->whereIn('id', $sceneIds)->update(['location_id' => $entry->id]);

                $this->syncLinked($project, $entry, [...$data['rule_ids'] ?? [], ...$data['lore_ids'] ?? []], fn ($query) => $query->where('type', '!=', 'location'));
            } else {
                $entry->scenes()->sync($data['scene_ids'] ?? []);
                $entry->mechanics()->sync($data['mechanic_ids'] ?? []);

                $this->syncLinked($project, $entry, $data['location_ids'] ?? [], fn ($query) => $query->where('type', 'location'));
            }
        });
    }

    /**
     * Sustituye los vínculos simétricos de la entrada con las entradas que cumplen $scope
     * (los demás vínculos se conservan) y los guarda en ambos sentidos.
     */
    private function syncLinked(Project $project, LoreEntry $entry, array $ids, Closure $scope): void
    {
        $candidates = $project->loreEntries()->where($scope)->whereKeyNot($entry->id)->pluck('id');

        DB::table('lore_entry_links')
            ->where(fn ($query) => $query->where('lore_entry_id', $entry->id)->whereIn('linked_id', $candidates))
            ->orWhere(fn ($query) => $query->where('linked_id', $entry->id)->whereIn('lore_entry_id', $candidates))
            ->delete();

        DB::table('lore_entry_links')->insert(
            collect($ids)
                ->flatMap(fn (int $id) => [
                    ['lore_entry_id' => $entry->id, 'linked_id' => $id],
                    ['lore_entry_id' => $id, 'linked_id' => $entry->id],
                ])
                ->all()
        );
    }

    private function toEntry(Project $project, string $kind, LoreEntry $entry): RedirectResponse
    {
        return redirect()->route('projects.bible.index', [$project, $kind, 'entry' => $entry->id]);
    }

    private function validated(Request $request, Project $project, LoreEntry $entry): array
    {
        // Todo lo vinculado debe pertenecer al mismo proyecto.
        $inProject = fn (string $table) => Rule::exists($table, 'id')->where('project_id', $project->id);
        $lore = fn () => Rule::exists('lore_entries', 'id')->where('project_id', $project->id);

        $rules = [
            'title' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:3000'],
            'narrative_function' => ['required', 'string', 'max:2000'],
            'emotional_tone' => ['nullable', 'string', 'max:255'],
            'characters' => ['nullable', 'array', 'max:100'],
            'characters.*.id' => ['required', 'integer', 'distinct', $inProject('characters')],
            'characters.*.role' => ['nullable', Rule::in(LoreEntry::CHARACTER_ROLES)],
            'scene_ids' => ['nullable', 'array', 'max:200'],
            'scene_ids.*' => ['integer', 'distinct', $inProject('scenes')],
        ];

        if ($entry->type === 'location') {
            return $request->validate([
                ...$rules,
                'subtype' => ['nullable', Rule::in(LoreEntry::LOCATION_TYPES)],
                'parent_id' => ['nullable', 'integer', $lore()->where('type', 'location'), $this->notInsideItself($project, $entry)],
                'access' => ['nullable', 'string', 'max:2000'],
                'rule_ids' => ['nullable', 'array', 'max:100'],
                'rule_ids.*' => ['integer', 'distinct', $lore()->where('type', 'rule')],
                'lore_ids' => ['nullable', 'array', 'max:100'],
                'lore_ids.*' => ['integer', 'distinct', $lore()->whereNotIn('type', ['location', 'rule'])],
            ]);
        }

        return $request->validate([
            ...$rules,
            'subtype' => ['nullable', Rule::in(LoreEntry::RULE_CATEGORIES)],
            'statement' => ['required', 'string', 'max:500'],
            'rigidity' => ['required', Rule::in(LoreEntry::RIGIDITIES)],
            'scope' => ['required', Rule::in(LoreEntry::SCOPES)],
            'origin' => ['nullable', 'string', 'max:2000'],
            'consequence' => ['nullable', 'string', 'max:2000'],
            'exceptions' => ['nullable', 'string', 'max:2000'],
            'location_ids' => ['nullable', 'array', 'max:100'],
            'location_ids.*' => ['integer', 'distinct', $lore()->where('type', 'location')],
            'mechanic_ids' => ['nullable', 'array', 'max:100'],
            'mechanic_ids.*' => ['integer', 'distinct', $inProject('mechanics')],
        ]);
    }

    /**
     * Evita ciclos en la jerarquía: el lugar padre no puede ser el propio lugar ni uno de sus descendientes.
     */
    private function notInsideItself(Project $project, LoreEntry $entry): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($project, $entry): void {
            if (! $entry->exists) {
                return;
            }

            $seen = [];
            for ($current = (int) $value; $current && ! in_array($current, $seen, true); $current = (int) $project->loreEntries()->whereKey($current)->value('parent_id')) {
                if ($current === $entry->id) {
                    $fail(__('A place cannot be inside itself.'));

                    return;
                }
                $seen[] = $current;
            }
        };
    }

    private function ensureEntry(Project $project, string $kind, LoreEntry $entry): void
    {
        $this->authorize('update', $project);
        abort_unless($entry->project_id === $project->id && $entry->type === self::KINDS[$kind], 404);
    }
}
