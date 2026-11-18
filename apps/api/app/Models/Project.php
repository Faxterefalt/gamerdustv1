<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'game_genre',
        'language',
        'narrative_type',
        'branching_enabled',
        'premise',
        'central_conflict',
        'target_audience',
        'status',
        'favorite',
    ];

    /** Rol de cada usuario ya consultado en esta petición (la policy pregunta varias veces). */
    private array $roles = [];

    protected static function booted(): void
    {
        static::saving(function (Project $project) {
            $project->branching_enabled = $project->narrative_type !== 'linear';
        });
    }

    protected function casts(): array
    {
        return ['favorite' => 'boolean', 'branching_enabled' => 'boolean'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function members(): HasMany
    {
        return $this->hasMany(ProjectMember::class);
    }

    /**
     * Rol del usuario en el proyecto: "owner" (dueño, administrador implícito), admin, editor, viewer
     * o null si no tiene acceso.
     */
    public function roleFor(?User $user): ?string
    {
        if (! $user) {
            return null;
        }

        if ($this->user_id === $user->id) {
            return 'owner';
        }

        return $this->roles[$user->id] ??= $this->members()->where('user_id', $user->id)->value('role');
    }

    /** Proyectos propios y compartidos con el usuario. */
    public function scopeAccessibleBy(Builder $query, User $user): void
    {
        $query->where(fn (Builder $query) => $query
            ->where('user_id', $user->id)
            ->orWhereHas('members', fn (Builder $members) => $members->where('user_id', $user->id)));
    }

    public function constraint(): HasOne
    {
        return $this->hasOne(ProjectConstraint::class);
    }

    public function loreEntries(): HasMany
    {
        return $this->hasMany(LoreEntry::class);
    }

    public function characters(): HasMany
    {
        return $this->hasMany(Character::class);
    }

    public function scenes(): HasMany
    {
        return $this->hasMany(Scene::class)->orderBy('order');
    }

    public function dialogueNodes(): HasMany
    {
        return $this->hasMany(DialogueNode::class);
    }

    public function emotionalAnalyses(): HasMany
    {
        return $this->hasMany(EmotionalAnalysis::class)->latest();
    }

    public function narrativeValidations(): HasMany
    {
        return $this->hasMany(NarrativeValidation::class)->latest();
    }

    public function costEstimations(): HasMany
    {
        return $this->hasMany(CostEstimation::class)->latest();
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class)->latest('id');
    }

    public function mechanics(): HasMany
    {
        return $this->hasMany(Mechanic::class);
    }

    public function aiGenerations(): HasMany
    {
        return $this->hasMany(AiGeneration::class)->latest();
    }

    public function branchingVariables(): HasMany
    {
        return $this->hasMany(BranchingVariable::class)->orderBy('key');
    }
}
