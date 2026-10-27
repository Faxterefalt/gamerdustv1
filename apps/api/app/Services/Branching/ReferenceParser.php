<?php

namespace App\Services\Branching;

/**
 * Parser puro (sin base de datos) de referencias {{Nombre del pasaje}}.
 */
class ReferenceParser
{
    public const MAX_LENGTH = 255;

    private const PATTERN = '/\{\{([^{}\r\n]+?)\}\}/u';

    /**
     * Referencias completas, sin vacías ni duplicadas (por clave normalizada), en orden de aparición.
     *
     * @return array<int, array{key: string, label: string}>
     */
    public function extract(?string $text): array
    {
        if ($text === null || $text === '') {
            return [];
        }

        preg_match_all(self::PATTERN, $text, $matches);

        $references = [];

        foreach ($matches[1] as $raw) {
            $label = $this->clean($raw);

            if ($label === '' || mb_strlen($label) > self::MAX_LENGTH) {
                continue;
            }

            $references[$this->normalize($label)] ??= ['key' => $this->normalize($label), 'label' => $label];
        }

        return array_values($references);
    }

    /**
     * Reemplaza toda referencia cuyo nombre normalizado sea $oldKey por {{$newLabel}}.
     */
    public function replace(string $text, string $oldKey, string $newLabel): string
    {
        return preg_replace_callback(
            self::PATTERN,
            fn (array $match) => $this->normalize($match[1]) === $oldKey ? '{{'.$newLabel.'}}' : $match[0],
            $text
        ) ?? $text;
    }

    public function normalize(string $value): string
    {
        return mb_strtolower($this->clean($value));
    }

    public function clean(string $value): string
    {
        return trim(preg_replace('/\s+/u', ' ', $value) ?? $value);
    }
}
