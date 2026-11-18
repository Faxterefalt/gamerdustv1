<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Bloqueo blando de edición (HU 26): quién edita una escena o un nodo y hasta cuándo.
 */
class EditLock extends Model
{
    protected $fillable = ['project_id', 'lockable_type', 'lockable_id', 'user_id', 'expires_at'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lockable(): MorphTo
    {
        return $this->morphTo();
    }
}
