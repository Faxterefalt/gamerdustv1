<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class CostEstimation extends Model
{
    protected $fillable = [
        'project_id',
        'costable_type',
        'costable_id',
        'cost_level',
        'cost_score',
        'cost_factors',
        'explanation',
    ];

    protected function casts(): array
    {
        return [
            'cost_score' => 'integer',
            'cost_factors' => 'array',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function costable(): MorphTo
    {
        return $this->morphTo();
    }
}
