<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class DialogueNode extends Model
{
    public const TYPES = [
        'cutscene',
        'ambient',
        'bark',
        'interactive_no_branch',
        'interactive_rubber_banding',
        'interactive_alternative_paths',
    ];

    protected $fillable = [
        'project_id',
        'scene_id',
        'character_id',
        'node_key',
        'title',
        'dialogue_type',
        'text',
        'emotional_tone',
        'trigger_condition',
        'pos_x',
        'pos_y',
    ];

    protected function casts(): array
    {
        return ['pos_x' => 'float', 'pos_y' => 'float'];
    }

    public function displayTitle(): string
    {
        return filled($this->title) ? $this->title : $this->node_key;
    }

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
