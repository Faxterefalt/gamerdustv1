<?php

namespace App\Services\Script;

use App\Models\Scene;

/**
 * Texto plano de una escena para el análisis: conserva quién habla en cada diálogo.
 *
 *   EXT. PUERTO - NOCHE
 *   Mara mira el mar.
 *   MARA (en voz baja): No vuelvas.
 */
class ScenePlainText
{
    public function build(Scene $scene): string
    {
        $lines = [];
        $speaker = null;
        $aside = null;

        foreach ($scene->script ?? [] as $block) {
            $text = trim((string) ($block['text'] ?? ''));
            $kind = $block['kind'] ?? 'action';

            if ($kind === 'character') {
                $this->flushAside($lines, $speaker, $aside);
                $speaker = $text !== '' ? mb_strtoupper($text) : null;

                continue;
            }

            if ($text === '') {
                continue;
            }

            switch ($kind) {
                case 'parenthetical':
                    $this->flushAside($lines, $speaker, $aside);
                    $aside = trim($text, '() ');
                    break;
                case 'dialogue':
                    $who = $speaker ?? '?';
                    $lines[] = $aside !== null ? "$who ($aside): $text" : "$who: $text";
                    $aside = null;
                    break;
                case 'heading':
                    $this->flushAside($lines, $speaker, $aside);
                    $speaker = null;
                    $lines[] = mb_strtoupper($text);
                    break;
                default:
                    $this->flushAside($lines, $speaker, $aside);
                    $speaker = null;
                    $lines[] = $text;
            }
        }

        $this->flushAside($lines, $speaker, $aside);

        return implode("\n", $lines);
    }

    /**
     * Recorta el texto a un máximo de palabras sin partir líneas salvo la última.
     *
     * @return array{0: string, 1: bool} texto y si se recortó
     */
    public function limit(string $text, int $maxWords): array
    {
        $kept = [];
        $count = 0;

        foreach (explode("\n", $text) as $line) {
            $words = preg_split('/\s+/u', trim($line), -1, PREG_SPLIT_NO_EMPTY) ?: [];

            if ($count + count($words) > $maxWords) {
                $rest = $maxWords - $count;

                if ($rest > 0) {
                    $kept[] = implode(' ', array_slice($words, 0, $rest)).' …';
                }

                return [implode("\n", $kept), true];
            }

            $kept[] = $line;
            $count += count($words);
        }

        return [$text, false];
    }

    /**
     * Una acotación sin diálogo detrás se conserva como línea propia.
     */
    private function flushAside(array &$lines, ?string $speaker, ?string &$aside): void
    {
        if ($aside !== null) {
            $lines[] = ($speaker ?? '?')." ($aside)";
            $aside = null;
        }
    }
}
