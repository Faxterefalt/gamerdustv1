<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class LoreEntry extends Model
{
    /** Tipos de lugar (subtype de las entradas "location"). */
    public const LOCATION_TYPES = ['interior', 'exterior', 'city', 'region', 'building', 'nature', 'vehicle'];

    /** Categorías de regla (subtype de las entradas "rule"). */
    public const RULE_CATEGORIES = ['society', 'magic', 'technology', 'physics', 'religion', 'economy'];

    public const RIGIDITIES = ['unbreakable', 'costly', 'flexible'];

    /** Alcance de una regla: solo en sus lugares vinculados o en todo el mundo. */
    public const SCOPES = ['linked', 'global'];

    /** Relación de un personaje con una regla. */
    public const CHARACTER_ROLES = ['breaks', 'enforces'];

    protected $fillable = [
        'project_id',
        'title',
        'type',
        'subtype',
        'parent_id',
        'description',
        'narrative_function',
        'emotional_tone',
        'access',
        'statement',
        'rigidity',
        'scope',
        'origin',
        'consequence',
        'exceptions',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function emotionalAnalyses(): MorphMany
    {
        return $this->morphMany(EmotionalAnalysis::class, 'analyzable')->latest();
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function characters(): BelongsToMany
    {
        return $this->belongsToMany(Character::class)->withPivot('role');
    }

    /** Escenas que ponen a prueba una regla. */
    public function scenes(): BelongsToMany
    {
        return $this->belongsToMany(Scene::class);
    }

    /** Escenas cuya ubicación es este lugar. */
    public function locatedScenes(): HasMany
    {
        return $this->hasMany(Scene::class, 'location_id');
    }

    public function mechanics(): BelongsToMany
    {
        return $this->belongsToMany(Mechanic::class);
    }

    /** Entradas vinculadas (la tabla guarda cada vínculo en los dos sentidos). */
    public function linkedEntries(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'lore_entry_links', 'lore_entry_id', 'linked_id');
    }

    /**
     * Datos de la ficha para las vistas de la Biblia (lugares y reglas).
     * Requiere cargadas: characters, scenes, locatedScenes, mechanics y linkedEntries.
     */
    public function toBiblePayload(): array
    {
        $linked = $this->linkedEntries;

        return [
            ...$this->only([
                'id', 'project_id', 'title', 'type', 'subtype', 'parent_id', 'description', 'narrative_function', 'emotional_tone',
                'access', 'statement', 'rigidity', 'scope', 'origin', 'consequence', 'exceptions',
            ]),
            'characters' => $this->characters->map(fn (Character $character) => ['id' => $character->id, 'role' => $character->pivot->role])->values(),
            'scene_ids' => ($this->type === 'location' ? $this->locatedScenes : $this->scenes)->pluck('id')->values(),
            'location_ids' => $linked->where('type', 'location')->pluck('id')->values(),
            'rule_ids' => $linked->where('type', 'rule')->pluck('id')->values(),
            'lore_ids' => $linked->whereNotIn('type', ['location', 'rule'])->pluck('id')->values(),
            'mechanic_ids' => $this->mechanics->pluck('id')->values(),
        ];
    }
}
