<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Mechanic extends Model
{
    public const KINDS = ['decision', 'exploration', 'resource'];

    public const ICONS = ['footsteps', 'dialogue', 'mind', 'combat', 'exploration', 'trust'];

    protected $fillable = [
        'project_id',
        'title',
        'kind',
        'icon',
        'description',
        'activation',
        'narrative_effect',
        'playable_actions',
        'restrictions',
        'conflict',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function scenes(): BelongsToMany
    {
        return $this->belongsToMany(Scene::class, 'mechanic_scene');
    }

    public function characters(): BelongsToMany
    {
        return $this->belongsToMany(Character::class, 'mechanic_character');
    }

    /**
     * Forma que consume el frontend: campos propios + ids de escenas y personajes vinculados.
     */
    public function toPayload(): array
    {
        return [
            ...$this->only(['id', 'project_id', 'title', 'kind', 'icon', 'description', 'activation', 'narrative_effect', 'playable_actions', 'restrictions', 'conflict']),
            'scene_ids' => $this->scenes->pluck('id')->all(),
            'character_ids' => $this->characters->pluck('id')->all(),
        ];
    }
}
