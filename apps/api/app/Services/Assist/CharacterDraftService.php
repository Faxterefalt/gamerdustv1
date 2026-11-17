<?php

namespace App\Services\Assist;

use App\Models\Project;
use App\Services\Ai\AiUnavailableException;
use App\Services\Ai\GroqClient;
use App\Services\Emotion\EmotionTranslator;
use App\Services\Emotion\ScenePrompt;
use Illuminate\Support\Str;

/**
 * "Generar": borrador de ficha de personaje a partir de una idea breve del autor.
 * Solo propone: el borrador rellena el formulario y nada se guarda hasta que el autor pulsa Guardar.
 */
class CharacterDraftService
{
    public const SCHEMA_NAME = 'character_draft';

    /** Campos de texto corto (255) y largo (5000) que existen en `characters`. */
    private const SHORT = ['name', 'role', 'archetype', 'gender'];

    private const LONG = ['background', 'personality', 'speech_style', 'motivation', 'fear', 'desire', 'emotional_arc', 'visual_description', 'voice_notes', 'limits'];

    public function __construct(
        private readonly GroqClient $groq,
        private readonly EmotionTranslator $translator,
        private readonly ScenePrompt $prompt,
    ) {}

    /**
     * @return array{draft: array<string, mixed>, duplicate_name: bool, generation_id: int|null}
     *
     * @throws AiUnavailableException
     */
    public function generate(Project $project, string $idea, int $userId): array
    {
        $response = $this->groq->chatJson(
            $this->system($project),
            $this->user($project, $idea),
            $this->schema(),
            self::SCHEMA_NAME,
            log: ['project_id' => $project->id, 'user_id' => $userId, 'type' => 'character_draft'],
        );

        $draft = $this->validate($response->data);

        if ($draft === null) {
            throw new AiUnavailableException('invalid_output', generationId: $response->generationId);
        }

        $normalized = fn (?string $name) => Str::of((string) $name)->lower()->squish()->value();
        $duplicate = $project->characters()->pluck('name')->contains(fn (string $name) => $normalized($name) === $normalized($draft['name']));

        return ['draft' => $draft, 'duplicate_name' => $duplicate, 'generation_id' => $response->generationId];
    }

    private function system(Project $project): string
    {
        $emotions = implode(', ', $this->translator->keys());
        $language = $this->prompt->language($project->language ?: 'es');

        return <<<PROMPT
        Eres un asistente de diseño narrativo para videojuegos. A partir de una idea breve del autor,
        propones un BORRADOR de ficha de personaje coherente con el proyecto. El autor lo revisará,
        lo cambiará y decidirá si lo guarda.

        Reglas:
        1. No repitas el nombre de un personaje existente ni contradigas los lugares y reglas listados.
        2. Escribe todos los textos en el idioma de la narrativa ({$language}).
        3. Textos breves y concretos: una a tres frases por campo. Nada de listas largas.
        4. "age": número entero, o null si no aplica o no se puede deducir.
        5. "initial_emotion": la emoción con la que empieza la historia, una de: {$emotions}.
           "initial_intensity": low, medium o high.
        6. Deja como cadena vacía los campos que no puedas deducir de la idea ni del proyecto.
        PROMPT;
    }

    private function user(Project $project, string $idea): string
    {
        $limit = (int) config('gamerdust.ai.max_context_items', 8);
        $lines = [
            "PROYECTO: {$project->title} · Género: ".($project->game_genre ?: '—'),
        ];

        $essence = array_filter([
            'Premisa' => $project->premise,
            'Conflicto principal' => $project->central_conflict,
            'Tema' => $project->constraint?->central_theme,
            'Ambientación' => $project->constraint?->setting,
        ], 'filled');
        if ($essence) {
            $lines[] = 'ESENCIA: '.implode(' / ', array_map(fn ($key, $value) => "$key: ".Str::limit($value, 300), array_keys($essence), $essence));
        }

        $characters = $project->characters()->orderBy('name')->limit(30)->get(['name', 'role']);
        $lines[] = 'PERSONAJES EXISTENTES: '.($characters->isEmpty() ? 'ninguno' : $characters->map(fn ($character) => $character->name.($character->role ? " ({$character->role})" : ''))->implode(', '));

        $places = $project->loreEntries()->where('type', 'location')->orderBy('title')->limit($limit)->pluck('title');
        $lines[] = 'LUGARES: '.($places->isEmpty() ? 'ninguno' : $places->implode(', '));

        $rules = $project->loreEntries()->where('type', 'rule')->orderBy('title')->limit($limit)->get(['title', 'statement']);
        $lines[] = 'REGLAS DEL MUNDO:';
        foreach ($rules as $rule) {
            $lines[] = "- \"{$rule->title}\"".($rule->statement ? ': '.Str::limit($rule->statement, 200) : '');
        }
        if ($rules->isEmpty()) {
            $lines[] = '- ninguna';
        }

        $lines[] = '';
        $lines[] = 'IDEA DEL AUTOR: '.trim($idea);

        return implode("\n", $lines);
    }

    public function schema(): array
    {
        $properties = [
            ...array_fill_keys(self::SHORT, ['type' => 'string']),
            'age' => ['type' => ['integer', 'null']],
            ...array_fill_keys(self::LONG, ['type' => 'string']),
            'initial_emotion' => ['type' => 'string', 'enum' => $this->translator->keys()],
            'initial_intensity' => ['type' => 'string', 'enum' => array_keys(config('gamerdust.emotion.intensity'))],
        ];

        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => array_keys($properties),
            'properties' => $properties,
        ];
    }

    /**
     * Validación en PHP: textos recortados a los límites del formulario, edad en rango y
     * emoción/intensidad de la lista. Sin nombre el borrador no sirve.
     */
    public function validate(array $data): ?array
    {
        $text = fn (mixed $value, int $limit) => is_string($value) ? Str::limit(trim($value), $limit, '') : '';
        $draft = [];

        foreach (self::SHORT as $field) {
            $draft[$field] = $text($data[$field] ?? null, 255);
        }
        foreach (self::LONG as $field) {
            $draft[$field] = $text($data[$field] ?? null, 5000);
        }

        $age = filter_var($data['age'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 200]]);
        $draft['age'] = $age === false ? null : $age;

        $emotion = $data['initial_emotion'] ?? null;
        $draft['initial_emotion'] = is_string($emotion) && $this->translator->isEmotion($emotion) ? $emotion : null;
        $intensity = $data['initial_intensity'] ?? null;
        $draft['initial_intensity'] = $draft['initial_emotion']
            ? (in_array($intensity, array_keys(config('gamerdust.emotion.intensity')), true) ? $intensity : 'medium')
            : null;

        return $draft['name'] === '' ? null : $draft;
    }
}
