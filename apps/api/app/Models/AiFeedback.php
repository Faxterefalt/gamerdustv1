<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Valoración 👍/👎 de una propuesta de la IA (sugerencia de un análisis o generación).
 */
class AiFeedback extends Model
{
    protected $table = 'ai_feedback';

    protected $fillable = [
        'project_id',
        'user_id',
        'ai_generation_id',
        'emotional_analysis_id',
        'item_index',
        'useful',
    ];

    protected function casts(): array
    {
        return [
            'item_index' => 'integer',
            'useful' => 'boolean',
        ];
    }

    public function generation(): BelongsTo
    {
        return $this->belongsTo(AiGeneration::class, 'ai_generation_id');
    }

    public function analysis(): BelongsTo
    {
        return $this->belongsTo(EmotionalAnalysis::class, 'emotional_analysis_id');
    }
}
