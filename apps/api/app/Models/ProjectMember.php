<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Miembro de un proyecto (HU 5). El dueño no tiene fila: es administrador implícito.
 *
 *   admin  → lee, escribe y gestiona miembros
 *   editor → lee y escribe
 *   viewer → solo lee
 */
class ProjectMember extends Model
{
    public const ROLES = ['admin', 'editor', 'viewer'];

    /** Roles que pueden modificar el contenido del proyecto ("owner" es el dueño). */
    public const WRITERS = ['owner', 'admin', 'editor'];

    /** Roles que pueden gestionar miembros. */
    public const MANAGERS = ['owner', 'admin'];

    protected $fillable = ['project_id', 'user_id', 'role', 'favorite', 'invited_by'];

    protected function casts(): array
    {
        return ['favorite' => 'boolean'];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function toPayload(): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'name' => $this->user?->name,
            'email' => $this->user?->email,
            'role' => $this->role,
            'created_at' => $this->created_at?->toJSON(),
        ];
    }
}
