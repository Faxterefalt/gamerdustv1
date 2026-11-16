<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectRequest extends FormRequest
{
    public const GENRES = ['Aventura', 'RPG', 'Novela visual', 'Aventura gráfica', 'Acción-aventura', 'Otro'];

    public const LANGUAGES = ['es', 'en'];

    public const NARRATIVE_TYPES = ['linear', 'balanced', 'branching'];

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'game_genre' => ['required', Rule::in(self::GENRES)],
            'language' => ['required', Rule::in(self::LANGUAGES)],
            'narrative_type' => ['required', Rule::in(self::NARRATIVE_TYPES)],
            'premise' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
