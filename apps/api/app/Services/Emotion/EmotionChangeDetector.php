<?php

namespace App\Services\Emotion;

/**
 * Detecta cambios emocionales abruptos frente al estado previo (personaje o escena anterior).
 *
 * División metodológica: la REGLA decide si el cambio es abrupto (umbral fijo y reproducible)
 * y la IA solo EXPLICA si el texto lo justifica.
 *   abrupto y sin justificar → alerta roja
 *   abrupto y justificado    → aviso ámbar
 */
class EmotionChangeDetector
{
    public const RED = 'red';

    public const AMBER = 'amber';

    /**
     * @param  array{v: float, a: float, d: float}|null  $previous  null si no hay estado previo
     * @param  array{v: float, a: float, d: float}  $current
     * @param  bool|null  $justified  lo que dice la IA; null = sin explicación (cuenta como no justificado)
     * @return array{delta: float, abrupt: bool, alert: string|null}
     */
    public function compare(?array $previous, array $current, ?bool $justified = null): array
    {
        if ($previous === null) {
            return ['delta' => 0.0, 'abrupt' => false, 'alert' => null];
        }

        $delta = $this->delta($previous, $current);
        $abrupt = $delta > (float) config('gamerdust.emotion.abrupt_threshold', 0.40);

        return [
            'delta' => $delta,
            'abrupt' => $abrupt,
            'alert' => $abrupt ? ($justified === true ? self::AMBER : self::RED) : null,
        ];
    }

    /**
     * max(|Δv|, |Δa|, |Δd|), redondeado para que el umbral no dependa de errores de coma flotante.
     */
    public function delta(array $previous, array $current): float
    {
        return round(max(
            abs($current['v'] - $previous['v']),
            abs($current['a'] - $previous['a']),
            abs($current['d'] - $previous['d']),
        ), 3);
    }
}
