<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DialogueOption extends Model
{
    protected $fillable = [
        'dialogue_node_id',
        'next_dialogue_node_id',
        'player_option',
        'consequence',
        'required_condition',
    ];

    public function dialogueNode(): BelongsTo
    {
        return $this->belongsTo(DialogueNode::class);
    }

    public function nextDialogueNode(): BelongsTo
    {
        return $this->belongsTo(DialogueNode::class, 'next_dialogue_node_id');
    }
}
