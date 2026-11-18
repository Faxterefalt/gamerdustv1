<?php

namespace App\Services\Collaboration;

use App\Models\EditLock;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\UniqueConstraintViolationException;

/**
 * Bloqueo blando de edición (HU 26, opción a). No impide guardar: anuncia quién está editando
 * una escena o un nodo para que el otro lo sepa antes de que el 409 tenga que intervenir.
 *
 * Quien llega primero lo tiene mientras envíe el latido; si lo deja de enviar (cerró la pestaña,
 * perdió la conexión) caduca y el siguiente latido de otro usuario lo toma.
 */
class EditLockService
{
    /**
     * Renueva o toma el bloqueo del usuario, o informa de quién lo tiene.
     *
     * @return array{holder: array{id: int, name: string, since: string|null}|null, heartbeat_seconds: int, lock_seconds: int}
     */
    public function heartbeat(Project $project, Model $lockable, User $user): array
    {
        $lock = $this->find($lockable);

        if ($lock && $lock->user_id !== $user->id && $lock->expires_at->isFuture()) {
            return $this->response($lock);
        }

        // El de otro usuario ya caducó: se sustituye (y "desde" vuelve a empezar).
        if ($lock && $lock->user_id !== $user->id) {
            $lock->delete();
            $lock = null;
        }

        $attributes = ['project_id' => $project->id, 'user_id' => $user->id, 'expires_at' => now()->addSeconds($this->ttl())];

        try {
            $lock
                ? $lock->update($attributes)
                : EditLock::create([...$attributes, 'lockable_type' => $lockable::class, 'lockable_id' => $lockable->getKey()]);
        } catch (UniqueConstraintViolationException) {
            // Otro usuario lo tomó en el mismo instante: gana el primero.
            return $this->response($this->find($lockable));
        }

        return $this->response(null);
    }

    /** Suelta el bloqueo si es del usuario (al cambiar de escena o cerrar la pestaña). */
    public function release(Model $lockable, User $user): void
    {
        EditLock::where('lockable_type', $lockable::class)
            ->where('lockable_id', $lockable->getKey())
            ->where('user_id', $user->id)
            ->delete();
    }

    private function find(Model $lockable): ?EditLock
    {
        return EditLock::with('user:id,name')
            ->where('lockable_type', $lockable::class)
            ->where('lockable_id', $lockable->getKey())
            ->first();
    }

    private function response(?EditLock $holder): array
    {
        return [
            'holder' => $holder && $holder->expires_at->isFuture() ? [
                'id' => $holder->user_id,
                'name' => $holder->user?->name ?? __('Deleted user'),
                'since' => $holder->created_at?->toJSON(),
            ] : null,
            'heartbeat_seconds' => (int) config('gamerdust.collaboration.heartbeat_seconds', 20),
            'lock_seconds' => $this->ttl(),
        ];
    }

    private function ttl(): int
    {
        return (int) config('gamerdust.collaboration.lock_seconds', 60);
    }
}
