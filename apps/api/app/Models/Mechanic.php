<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Mechanic extends Model
{
    public const KINDS = ['decision', 'exploration', 'resource'];

    protected $fillable = ['project_id', 'title', 'kind', 'description', 'activation', 'narrative_effect'];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
