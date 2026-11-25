<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Character extends Model
{
    /** Disco privado del concept art: se sirve tras comprobar el acceso al proyecto. */
    public const IMAGE_DISK = 'local';

    protected $fillable = [
        'project_id',
        'name',
        'role',
        'archetype',
        'age',
        'gender',
        'background',
        'personality',
        'speech_style',
        'motivation',
        'values',
        'inner_conflict',
        'fear',
        'desire',
        'emotional_arc',
        'initial_emotion',
        'initial_intensity',
        'visual_description',
        'voice_notes',
        'limits',
        'image_path',
    ];

    protected $hidden = ['image_path'];

    protected function casts(): array
    {
        return [
            'age' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::deleted(function (Character $character) {
            if ($character->image_path) {
                Storage::disk(self::IMAGE_DISK)->delete($character->image_path);
            }
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function dialogueNodes(): HasMany
    {
        return $this->hasMany(DialogueNode::class);
    }

    /** Escenas en las que aparece (la misma pivote que usa el editor de guion). */
    public function scenes(): BelongsToMany
    {
        return $this->belongsToMany(Scene::class);
    }

    /** Fichas de lore vinculadas; en las reglas, `role` indica si la rompe o la impone. */
    public function loreEntries(): BelongsToMany
    {
        return $this->belongsToMany(LoreEntry::class)->withPivot('role');
    }

    /** Estados emocionales detectados por la IA, uno por escena analizada. */
    public function emotionalStates(): HasMany
    {
        return $this->hasMany(CharacterEmotionalState::class);
    }

    /**
     * Ficha del personaje para la Biblia Narrativa. Requiere cargada la relación scenes.
     */
    public function toSheetPayload(): array
    {
        return [
            ...$this->only([
                'id', 'project_id', 'name', 'role', 'archetype', 'age', 'gender', 'background', 'personality', 'speech_style',
                'motivation', 'values', 'inner_conflict', 'fear', 'desire', 'emotional_arc', 'visual_description', 'voice_notes', 'limits',
                'initial_emotion', 'initial_intensity',
            ]),
            'image_url' => $this->image_path
                ? route('projects.characters.image', [$this->project_id, $this->id, 'v' => $this->updated_at?->timestamp])
                : null,
            'scene_ids' => $this->scenes->pluck('id')->values(),
            // Participación en la ramificación (HU 16): nodos donde habla el personaje.
            'dialogue_nodes' => $this->relationLoaded('dialogueNodes')
                ? $this->dialogueNodes->map(fn (DialogueNode $node) => ['id' => $node->id, 'title' => $node->displayTitle(), 'dialogue_type' => $node->dialogue_type])->values()->all()
                : [],
        ];
    }
}
