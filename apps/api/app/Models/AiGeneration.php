<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiGeneration extends Model
{
    protected $fillable = [
        'project_id',
        'user_id',
        'generation_type',
        'prompt',
        'response',
        'model',
        'status',
        'prompt_tokens',
        'completion_tokens',
        'total_tokens',
        'latency_ms',
        'input_hash',
        'error',
    ];

    protected function casts(): array
    {
        return [
            'response' => 'array',
            'prompt_tokens' => 'integer',
            'completion_tokens' => 'integer',
            'total_tokens' => 'integer',
            'latency_ms' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
