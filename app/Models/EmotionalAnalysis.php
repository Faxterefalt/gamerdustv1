<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class EmotionalAnalysis extends Model
{
    protected $fillable = [
        'project_id',
        'analyzable_type',
        'analyzable_id',
        'input_text',
        'dominant_emotion',
        'valence',
        'arousal',
        'dominance',
        'emotion_scores',
        'interpretation',
        'suggestions',
    ];

    protected function casts(): array
    {
        return [
            'valence' => 'decimal:2',
            'arousal' => 'decimal:2',
            'dominance' => 'decimal:2',
            'emotion_scores' => 'array',
            'suggestions' => 'array',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function analyzable(): MorphTo
    {
        return $this->morphTo();
    }
}
