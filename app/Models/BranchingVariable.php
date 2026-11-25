<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Variable del recorrido (HU 19): las condiciones y efectos de las opciones la referencian por `key`.
 */
class BranchingVariable extends Model
{
    public const TYPES = ['bool', 'number'];

    protected $fillable = ['project_id', 'key', 'type', 'initial_value', 'description'];

    protected function casts(): array
    {
        return ['initial_value' => 'json'];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function toPayload(): array
    {
        return $this->only(['id', 'key', 'type', 'initial_value', 'description']);
    }
}
