<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectConstraint extends Model
{
    protected $fillable = [
        'project_id',
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
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
