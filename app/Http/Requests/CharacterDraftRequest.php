<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Generar un borrador de ficha de personaje a partir de una idea breve.
 */
class CharacterDraftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('project')) ?? false;
    }

    public function rules(): array
    {
        return [
            'idea' => ['required', 'string', 'min:3', 'max:500'],
        ];
    }
}
