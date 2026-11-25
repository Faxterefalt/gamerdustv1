<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectConstraint extends Model
{
    protected $fillable = [
        'project_id',
        'narrative_genre',
        'central_theme',
        'setting',
        'player_objective',
        'expected_outcome',
        'assignment',
        'max_characters',
        'max_pages',
        'max_budget',
        'requires_twist',
        'main_emotional_tone',
        'dominant_emotion',
        'secondary_emotions',
        'world_type',
        'player_role',
        'branching_level',
        'required_elements',
        'forbidden_elements',
        'creative_notes',
    ];

    protected function casts(): array
    {
        return [
            'secondary_emotions' => 'array',
            'required_elements' => 'array',
            'forbidden_elements' => 'array',
            'max_characters' => 'integer',
            'max_pages' => 'integer',
            'max_budget' => 'float',
            'requires_twist' => 'boolean',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
