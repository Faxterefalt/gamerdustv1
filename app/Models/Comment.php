<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Comment extends Model
{
    protected $fillable = ['project_id', 'scene_id', 'user_id', 'text'];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function scene(): BelongsTo
    {
        return $this->belongsTo(Scene::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Forma que consume el frontend (CommentsPanel).
     */
    public function toPayload(): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'scene_id' => $this->scene_id,
            'scene_title' => $this->scene?->title,
            'author' => $this->user?->name ?? __('Deleted user'),
            'text' => $this->text,
            'created_at' => $this->created_at?->toJSON(),
        ];
    }
}
