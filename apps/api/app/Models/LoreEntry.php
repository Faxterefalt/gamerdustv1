<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class LoreEntry extends Model
{
    protected $fillable = [
        'project_id',
        'title',
        'type',
        'description',
        'narrative_function',
        'emotional_tone',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function emotionalAnalyses(): MorphMany
    {
        return $this->morphMany(EmotionalAnalysis::class, 'analyzable')->latest();
    }
}
