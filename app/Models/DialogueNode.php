<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class DialogueNode extends Model
{
    protected $fillable = [
        'project_id',
        'scene_id',
        'character_id',
        'node_key',
        'dialogue_type',
        'text',
        'emotional_tone',
        'trigger_condition',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function scene(): BelongsTo
    {
        return $this->belongsTo(Scene::class);
    }

    public function character(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }

    public function options(): HasMany
    {
        return $this->hasMany(DialogueOption::class);
    }

    public function incomingOptions(): HasMany
    {
        return $this->hasMany(DialogueOption::class, 'next_dialogue_node_id');
    }

    public function emotionalAnalyses(): MorphMany
    {
        return $this->morphMany(EmotionalAnalysis::class, 'analyzable')->latest();
    }

    public function costEstimations(): MorphMany
    {
        return $this->morphMany(CostEstimation::class, 'costable')->latest();
    }
}
