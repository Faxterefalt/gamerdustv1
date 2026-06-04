<?php

namespace App\Models;

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
        'narrative_type',
        'premise',
        'central_conflict',
        'target_audience',
        'status',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
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

    public function aiGenerations(): HasMany
    {
        return $this->hasMany(AiGeneration::class)->latest();
    }
}
