<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Character extends Model
{
    protected $fillable = [
        'project_id',
        'name',
        'role',
        'archetype',
        'age',
        'gender',
        'background',
        'personality',
        'speech_style',
        'motivation',
        'fear',
        'desire',
        'emotional_arc',
        'visual_description',
        'voice_notes',
    ];

    protected function casts(): array
    {
        return [
            'age' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function dialogueNodes(): HasMany
    {
        return $this->hasMany(DialogueNode::class);
    }
}
