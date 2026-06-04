<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'game_genre' => ['nullable', 'string', 'max:255'],
            'narrative_type' => ['required', Rule::in(['game_story', 'balanced_narrative', 'player_story'])],
            'premise' => ['nullable', 'string'],
            'central_conflict' => ['nullable', 'string'],
            'target_audience' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(['draft', 'in_progress', 'completed'])],
        ];
    }
}
