<?php

namespace App\Services\Emotion;

use Illuminate\Support\Str;

/**
 * Validación en PHP de la respuesta de la IA (el modo estricto puede fallar de forma intermitente):
 * clamp de v/a/d a [0,1], emoción fuera de la lista → la más cercana, personajes ajenos a la
 * escena descartados y textos recortados.
 */
class SceneResultValidator
{
    public const EVIDENCE_LIMIT = 160;

    private const TEXT_LIMIT = 600;

    private const SEVERITIES = ['low', 'medium', 'high'];

    private const KINDS = ['emotion', 'coherence', 'pacing', 'conflict'];

    public function __construct(private readonly EmotionTranslator $translator) {}

    /**
     * Devuelve null si la respuesta no sirve (falta el objeto "scene").
     *
     * @param  list<int>  $characterIds  personajes vinculados a la escena (character_scene)
     * @return array{scene: array, characters: list<array>, inconsistencies: list<array>, suggestions: list<array>}|null
     */
    public function validate(array $data, array $characterIds): ?array
    {
        if (! is_array($data['scene'] ?? null)) {
            return null;
        }

        $scene = $data['scene'];
        $characters = [];

        foreach ($this->list($data['characters'] ?? null) as $character) {
            $id = filter_var($character['character_id'] ?? null, FILTER_VALIDATE_INT);

            if ($id === false || ! in_array($id, $characterIds, true) || isset($characters[$id])) {
                continue;
            }

            $characters[$id] = [
                'character_id' => $id,
                'name' => $this->text($character['name'] ?? '', 120),
                ...$this->emotion($character),
                'evidence' => $this->text($character['evidence'] ?? '', self::EVIDENCE_LIMIT),
                'out_of_character' => ($character['out_of_character'] ?? false) === true,
                'out_of_character_reason' => $this->text($character['out_of_character_reason'] ?? ''),
                'change_justified' => is_bool($character['change_justified'] ?? null) ? $character['change_justified'] : null,
                'change_explanation' => $this->text($character['change_explanation'] ?? ''),
            ];
        }

        return [
            'scene' => [
                ...$this->emotion($scene),
                'summary' => $this->text($scene['summary'] ?? ''),
                'evidence' => $this->text($scene['evidence'] ?? '', self::EVIDENCE_LIMIT),
                'change_justified' => is_bool($scene['change_justified'] ?? null) ? $scene['change_justified'] : null,
                'change_explanation' => $this->text($scene['change_explanation'] ?? ''),
            ],
            'characters' => array_values($characters),
            'inconsistencies' => array_values(array_filter(array_map(fn (array $item) => [
                'fragment' => $this->text($item['fragment'] ?? '', self::EVIDENCE_LIMIT),
                'contradicts' => $this->text($item['contradicts'] ?? '', 160),
                'explanation' => $this->text($item['explanation'] ?? ''),
                'severity' => in_array($item['severity'] ?? null, self::SEVERITIES, true) ? $item['severity'] : 'medium',
            ], array_slice($this->list($data['inconsistencies'] ?? null), 0, 10)), fn (array $item) => $item['explanation'] !== '')),
            'suggestions' => array_slice(array_values(array_filter(array_map(fn (array $item) => [
                'kind' => in_array($item['kind'] ?? null, self::KINDS, true) ? $item['kind'] : 'emotion',
                'text' => $this->text($item['text'] ?? ''),
                'why' => $this->text($item['why'] ?? ''),
            ], $this->list($data['suggestions'] ?? null)), fn (array $item) => $item['text'] !== '')), 0, 3),
        ];
    }

    /** @return array{v: float, a: float, d: float, emotion: string} */
    private function emotion(array $item): array
    {
        $v = $this->unit($item['v'] ?? null);
        $a = $this->unit($item['a'] ?? null);
        $d = $this->unit($item['d'] ?? null);
        $emotion = is_string($item['emotion'] ?? null) ? $item['emotion'] : null;

        return [
            'v' => $v,
            'a' => $a,
            'd' => $d,
            'emotion' => $this->translator->isEmotion($emotion) ? $emotion : $this->translator->nearestEmotion($v, $a, $d),
        ];
    }

    private function unit(mixed $value): float
    {
        return is_numeric($value) ? round(max(0.0, min(1.0, (float) $value)), 3) : 0.5;
    }

    private function text(mixed $value, int $limit = self::TEXT_LIMIT): string
    {
        return is_string($value) ? Str::limit(trim($value), $limit, '…') : '';
    }

    /** @return list<array> */
    private function list(mixed $value): array
    {
        return is_array($value) ? array_values(array_filter($value, 'is_array')) : [];
    }
}
