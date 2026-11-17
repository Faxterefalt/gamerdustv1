<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCharacterRequest;
use App\Models\Character as NarrativeCharacter;
use App\Models\Project;
use App\Services\Emotion\EmotionTranslator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

/**
 * Personajes de la Biblia Narrativa: catálogo + ficha (con concept art y escenas) en una sola página.
 */
class CharacterController extends Controller
{
    public function index(Request $request, Project $project, EmotionTranslator $emotions): Response
    {
        $this->authorize('view', $project);

        $characters = $project->characters()->with('scenes:id')->orderBy('name')->get();
        $selected = $request->integer('character');

        return Inertia::render('Characters/Index', [
            'project' => $project,
            'entries' => $characters->map->toSheetPayload()->values(),
            'selected' => $characters->contains('id', $selected) ? $selected : null,
            // Abrir con una ficha vacía (enlaces antiguos a "crear personaje").
            'startNew' => $request->boolean('new'),
            'scenes' => $project->scenes()->orderBy('order')->orderBy('id')->get(['id', 'title', 'order']),
            'emotionCatalog' => $emotions->catalog(),
        ]);
    }

    /** La ficha vive en el índice: se mantiene la ruta para los enlaces existentes. */
    public function create(Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        return redirect()->route('projects.characters.index', [$project, 'new' => 1]);
    }

    public function store(StoreCharacterRequest $request, Project $project): RedirectResponse
    {
        $character = $project->characters()->make();
        $this->save($project, $character, $request);

        return $this->toCharacter($project, $character)->with('success', __('Character created.'));
    }

    /** La ficha vive en el índice: se mantiene la ruta para los enlaces existentes. */
    public function edit(Project $project, NarrativeCharacter $character): RedirectResponse
    {
        $this->authorizeCharacter($project, $character);

        return $this->toCharacter($project, $character);
    }

    public function update(StoreCharacterRequest $request, Project $project, NarrativeCharacter $character): RedirectResponse
    {
        $this->authorizeCharacter($project, $character);

        $this->save($project, $character, $request);

        return $this->toCharacter($project, $character)->with('success', __('Character updated.'));
    }

    public function destroy(Project $project, NarrativeCharacter $character): RedirectResponse
    {
        $this->authorizeCharacter($project, $character);

        $character->delete();

        return back()->with('success', __('Character deleted.'));
    }

    /**
     * Concept art del personaje, desde el disco privado (solo para quien accede al proyecto).
     */
    public function image(Project $project, NarrativeCharacter $character): StreamedResponse
    {
        $this->authorize('view', $project);
        abort_unless($character->project_id === $project->id && $character->image_path, 404);

        $disk = Storage::disk(NarrativeCharacter::IMAGE_DISK);
        abort_unless($disk->exists($character->image_path), 404);

        return $disk->response($character->image_path, null, ['Cache-Control' => 'private, max-age=86400']);
    }

    /**
     * Guarda la ficha y sus escenas en una transacción. La imagen nueva se borra si algo falla
     * y la anterior solo cuando el cambio ya está guardado.
     */
    private function save(Project $project, NarrativeCharacter $character, StoreCharacterRequest $request): void
    {
        $data = $request->validated();
        $previousImage = $character->image_path;
        $newImage = $request->file('image')?->store("projects/{$project->id}/characters", NarrativeCharacter::IMAGE_DISK);
        $fields = Arr::except($data, ['image', 'remove_image', 'scene_ids']);

        // Sin emoción inicial no tiene sentido guardar su intensidad.
        if (array_key_exists('initial_emotion', $fields) && blank($fields['initial_emotion'])) {
            $fields['initial_intensity'] = null;
        }

        if ($newImage) {
            $fields['image_path'] = $newImage;
        } elseif ($request->boolean('remove_image')) {
            $fields['image_path'] = null;
        }

        try {
            DB::transaction(function () use ($character, $fields, $data, $request): void {
                $character->fill($fields)->save();

                // Solo los formularios que envían escenas (la ficha) las sincronizan.
                if ($request->has('scene_ids') || $request->boolean('sync_scenes')) {
                    $character->scenes()->sync($data['scene_ids'] ?? []);
                }
            });
        } catch (Throwable $exception) {
            if ($newImage) {
                Storage::disk(NarrativeCharacter::IMAGE_DISK)->delete($newImage);
            }

            throw $exception;
        }

        if ($previousImage && $previousImage !== $character->image_path) {
            Storage::disk(NarrativeCharacter::IMAGE_DISK)->delete($previousImage);
        }
    }

    private function toCharacter(Project $project, NarrativeCharacter $character): RedirectResponse
    {
        return redirect()->route('projects.characters.index', [$project, 'character' => $character->id]);
    }

    private function authorizeCharacter(Project $project, NarrativeCharacter $character): void
    {
        $this->authorize('update', $project);
        abort_unless($character->project_id === $project->id, 404);
    }
}
