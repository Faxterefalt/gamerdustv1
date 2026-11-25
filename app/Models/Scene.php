<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Scene extends Model
{
    protected $fillable = [
        'project_id',
        'title',
        'act',
        'order',
        'summary',
        'conflict',
        'expected_emotion',
        'interest_level',
        'scene_type',
        'player_decision',
        'consequence',
        'estimated_cost',
        'script',
        'location_id',
    ];

    protected function casts(): array
    {
        return [
            'order' => 'integer',
            'interest_level' => 'integer',
            'script' => 'array',
            'location_id' => 'integer',
        ];
    }

    public function characters(): BelongsToMany
    {
        return $this->belongsToMany(Character::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(LoreEntry::class, 'location_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(SceneVersion::class)->latest('id');
    }

    /**
     * Texto plano del guion (para métricas y análisis).
     */
    public function scriptText(): string
    {
        return trim(collect($this->script ?? [])->pluck('text')->filter()->implode("\n"));
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function dialogueNodes(): HasMany
    {
        return $this->hasMany(DialogueNode::class);
    }

    public function emotionalAnalyses(): MorphMany
    {
        return $this->morphMany(EmotionalAnalysis::class, 'analyzable')->latest();
    }

    public function emotionalStates(): HasMany
    {
        return $this->hasMany(CharacterEmotionalState::class);
    }

    public function costEstimations(): MorphMany
    {
        return $this->morphMany(CostEstimation::class, 'costable')->latest();
    }
}
