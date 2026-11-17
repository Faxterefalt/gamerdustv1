<?php

namespace App\Services\Emotion;

/**
 * "VAD invisible": traduce valencia, activación y dominancia (0-1) a lenguaje narrativo.
 * Clase pura (sin IA ni BD); los umbrales y centroides salen de config/gamerdust.php.
 *
 *   v → Tono · a → Tensión · d → Control del personaje · (v, a, d) → emoción más cercana
 */
class EmotionTranslator
{
    /**
     * Claves i18n (en inglés) de tono, tensión y control.
     *
     * @return array{tone: string, tension: string, control: string}
     */
    public function labels(float $v, float $a, float $d): array
    {
        return [
            'tone' => $this->band('tone', $v),
            'tension' => $this->band('tension', $a),
            'control' => $this->band('control', $d),
        ];
    }

    /**
     * Emoción de la lista cuyo centroide está a menor distancia euclídea.
     */
    public function nearestEmotion(float $v, float $a, float $d): string
    {
        $best = 'neutral';
        $bestDistance = INF;

        foreach ($this->emotions() as $key => $centroid) {
            $distance = ($v - $centroid['v']) ** 2 + ($a - $centroid['a']) ** 2 + ($d - $centroid['d']) ** 2;

            if ($distance < $bestDistance) {
                [$best, $bestDistance] = [$key, $distance];
            }
        }

        return $best;
    }

    /**
     * Estado elegido por el autor (emoción + intensidad) → centroide con la activación de esa intensidad.
     * Sin intensidad se usa la activación propia de la emoción.
     *
     * @return array{v: float, a: float, d: float}|null
     */
    public function fromAuthor(?string $emotion, ?string $intensity): ?array
    {
        $centroid = $emotion ? ($this->emotions()[$emotion] ?? null) : null;

        if (! $centroid) {
            return null;
        }

        $arousal = config("gamerdust.emotion.intensity.$intensity");

        return [
            'v' => (float) $centroid['v'],
            'a' => (float) ($arousal ?? $centroid['a']),
            'd' => (float) $centroid['d'],
        ];
    }

    public function isEmotion(?string $emotion): bool
    {
        return $emotion !== null && array_key_exists($emotion, $this->emotions());
    }

    /** @return list<string> */
    public function keys(): array
    {
        return array_keys($this->emotions());
    }

    /**
     * Lo que necesita el frontend: colores de cada emoción y bandas de las etiquetas
     * (para los ejes de los gráficos). No se duplican números en TypeScript.
     */
    public function catalog(): array
    {
        return [
            'emotions' => array_map(fn (array $emotion) => ['color' => $emotion['color']], $this->emotions()),
            'labels' => config('gamerdust.emotion.labels'),
            'intensities' => array_keys(config('gamerdust.emotion.intensity')),
        ];
    }

    /** @return array<string, array{v: float, a: float, d: float, color: string}> */
    private function emotions(): array
    {
        return config('gamerdust.emotion.emotions', []);
    }

    private function band(string $dimension, float $value): string
    {
        foreach (config("gamerdust.emotion.labels.$dimension") as [$limit, $label]) {
            if ($limit === null || $value < $limit) {
                return $label;
            }
        }

        return $label;
    }
}
