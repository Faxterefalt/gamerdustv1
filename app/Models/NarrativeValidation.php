<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Alerta de coherencia por regla. `subject` es el elemento afectado (escena, personaje, entrada de lore
 * o el propio proyecto) y `fingerprint` identifica la causa para no recrear alertas ya cerradas.
 */
class NarrativeValidation extends Model
{
    public const STATUSES = ['pending', 'resolved', 'dismissed'];

    protected $fillable = [
        'project_id',
        'validation_type',
        'severity',
        'message',
        'recommendation',
        'status',
        'fingerprint',
        'subject_type',
        'subject_id',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    public function scopePending(Builder $query): void
    {
        $query->where('status', 'pending');
    }

    public static function fingerprintFor(string $type, ?Model $subject, ?string $cause = null): string
    {
        return hash('sha256', implode('|', [$type, $subject ? $subject::class : '', $subject?->getKey() ?? '', $cause ?? '']));
    }

    /**
     * Datos para la interfaz, con el enlace al elemento afectado (evidencia de la alerta).
     */
    public function toPayload(): array
    {
        return [
            ...$this->only(['id', 'project_id', 'validation_type', 'severity', 'message', 'recommendation', 'status']),
            'updated_at' => $this->updated_at?->toJSON(),
            'subject' => $this->link(),
        ];
    }

    /** @return array{kind: string, label: string, url: string}|null */
    public function link(): ?array
    {
        $base = "/projects/{$this->project_id}";
        $subject = $this->subject_type === Project::class ? null : $this->subject;

        // Alertas de proyecto: llevan a la sección donde se corrige la causa.
        if ($this->subject_type === Project::class) {
            return match ($this->validation_type) {
                'character_limit_exceeded' => ['kind' => 'characters', 'label' => __('Characters'), 'url' => "{$base}/characters"],
                'page_limit_exceeded', 'twist_review' => ['kind' => 'script', 'label' => __('Script'), 'url' => "{$base}/script"],
                'budget_exceeded' => ['kind' => 'brief', 'label' => __('Production limits'), 'url' => "{$base}/bible#limits"],
                default => ['kind' => 'brief', 'label' => __('Essence'), 'url' => "{$base}/bible#brief"],
            };
        }

        return match (true) {
            $subject instanceof Character => ['kind' => 'character', 'label' => $subject->name, 'url' => "{$base}/characters?character={$subject->id}"],
            $subject instanceof Scene => ['kind' => 'scene', 'label' => $subject->title, 'url' => "{$base}/script?scene={$subject->id}"],
            $subject instanceof LoreEntry && $subject->type === 'rule' => ['kind' => 'rule', 'label' => $subject->title, 'url' => "{$base}/bible/rules?entry={$subject->id}"],
            $subject instanceof LoreEntry && $subject->type === 'location' => ['kind' => 'location', 'label' => $subject->title, 'url' => "{$base}/bible/locations?entry={$subject->id}"],
            $subject instanceof LoreEntry => ['kind' => 'lore', 'label' => $subject->title, 'url' => "{$base}/lore/{$subject->id}/edit"],
            default => null,
        };
    }
}
