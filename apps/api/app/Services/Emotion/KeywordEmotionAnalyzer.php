<?php

namespace App\Services\Emotion;

use App\Contracts\EmotionAnalyzer;
use App\Models\Scene;
use App\Services\Script\ScenePlainText;

/**
 * Adaptador del análisis simulado por palabras clave al contrato EmotionAnalyzer.
 * Funciona sin red: se usa en tests y como degradación cuando Groq no responde.
 * No cambia EmotionalAnalysisService (lo sigue usando el análisis de nodos de diálogo).
 */
class KeywordEmotionAnalyzer implements EmotionAnalyzer
{
    public function __construct(
        private readonly EmotionalAnalysisService $keywords,
        private readonly ScenePlainText $text,
    ) {}

    public function analyzeScene(Scene $scene): SceneEmotionResult
    {
        $text = $this->text->build($scene);

        if ($text === '') {
            $text = trim((string) $scene->summary);
        }

        [$text, $truncated] = $this->text->limit($text, (int) config('gamerdust.ai.max_scene_words', 1800));

        return self::fromKeywords($this->keywords->analyze($text), $truncated);
    }

    public function source(): string
    {
        return 'keywords';
    }

    /**
     * Convierte la salida antigua (valencia de -1 a 1, emoción "tension") a la escala 0-1
     * y a la lista de emociones de config/gamerdust.php.
     */
    public static function fromKeywords(array $raw, bool $truncated = false): SceneEmotionResult
    {
        $emotion = (string) $raw['dominant_emotion'];
        $emotion = config("gamerdust.emotion.legacy.$emotion", $emotion);

        if (! array_key_exists($emotion, config('gamerdust.emotion.emotions', []))) {
            $emotion = 'neutral';
        }

        return new SceneEmotionResult(
            scene: [
                'v' => self::unit(((float) $raw['valence'] + 1) / 2),
                'a' => self::unit((float) $raw['arousal']),
                'd' => self::unit((float) $raw['dominance']),
                'emotion' => $emotion,
                'summary' => (string) ($raw['interpretation'] ?? ''),
                'evidence' => '',
            ],
            suggestions: array_map(
                fn (string $text) => ['kind' => 'emotion', 'text' => $text, 'why' => ''],
                array_values($raw['suggestions'] ?? []),
            ),
            source: 'keywords',
            truncated: $truncated,
        );
    }

    private static function unit(float $value): float
    {
        return round(max(0.0, min(1.0, $value)), 3);
    }
}
