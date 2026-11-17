<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Estado emocional de un personaje en una escena, detectado por la IA (v/a/d en escala 0-1).
 */
class CharacterEmotionalState extends Model
{
    protected $fillable = [
        'project_id',
        'character_id',
        'scene_id',
        'emotional_analysis_id',
        'v',
        'a',
        'd',
        'emotion',
        'evidence',
        'abrupt_change',
        'change_justified',
        'change_explanation',
        'out_of_character',
        'out_of_character_reason',
    ];

    protected function casts(): array
    {
        return [
            'v' => 'float',
            'a' => 'float',
            'd' => 'float',
            'abrupt_change' => 'boolean',
            'change_justified' => 'boolean',
            'out_of_character' => 'boolean',
        ];
    }

    public function character(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }

    public function scene(): BelongsTo
    {
        return $this->belongsTo(Scene::class);
    }

    public function analysis(): BelongsTo
    {
        return $this->belongsTo(EmotionalAnalysis::class, 'emotional_analysis_id');
    }

    /** @return array{v: float, a: float, d: float} */
    public function vad(): array
    {
        return ['v' => $this->v, 'a' => $this->a, 'd' => $this->d];
    }
}
