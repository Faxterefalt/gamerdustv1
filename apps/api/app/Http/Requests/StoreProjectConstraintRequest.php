<?php

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectConstraintRequest extends FormRequest
{
    public const GENRES = [
        'fantasy', 'science_fiction', 'mystery', 'horror', 'drama',
        'adventure', 'comedy', 'romance', 'thriller', 'other',
    ];

    public function authorize(): bool
    {
        $project = $this->route('project');

        return $project instanceof Project && $this->user()?->can('update', $project);
    }

    public function rules(): array
    {
        return [
            'premise' => ['required', 'string', 'max:2000'],
            'central_conflict' => ['required', 'string', 'max:2000'],
            'narrative_genre' => ['required', Rule::in(self::GENRES)],
            'central_theme' => ['required', 'string', 'max:255'],
            'setting' => ['required', 'string', 'max:2000'],
            'player_objective' => ['required', 'string', 'max:2000'],
            'narrative_type' => ['required', Rule::in(['linear', 'branching', 'balanced'])],
        ];
    }
}
