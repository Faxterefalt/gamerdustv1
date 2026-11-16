<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SceneVersion extends Model
{
    protected $fillable = ['scene_id', 'user_id', 'title', 'script', 'character_ids', 'location_id'];

    protected function casts(): array
    {
        return ['script' => 'array', 'character_ids' => 'array', 'location_id' => 'integer'];
    }

    public function scene(): BelongsTo
    {
        return $this->belongsTo(Scene::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
