<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Scene extends Model
{
    protected $fillable = [
        'project_id',
        'title',
        'order',
        'summary',
        'conflict',
        'expected_emotion',
        'interest_level',
        'scene_type',
        'player_decision',
        'consequence',
        'estimated_cost',
    ];

    protected function casts(): array
    {
        return [
            'order' => 'integer',
            'interest_level' => 'integer',
        ];
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

    public function costEstimations(): MorphMany
    {
        return $this->morphMany(CostEstimation::class, 'costable')->latest();
    }
}
