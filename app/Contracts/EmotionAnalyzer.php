<?php

namespace App\Contracts;

use App\Models\Scene;
use App\Services\Emotion\SceneEmotionResult;

/**
 * Análisis emocional de una escena guardada. Solo lee: nunca modifica el texto.
 *
 * Implementaciones: KeywordEmotionAnalyzer (sin red, tests y degradación) y la de Groq.
 * El contrato permite sustituirlas en el futuro por un motor externo (docs/narrative-engine.md) sin tocar
 * controladores ni interfaz.
 */
interface EmotionAnalyzer
{
    public function analyzeScene(Scene $scene): SceneEmotionResult;

    /** Origen de los resultados: keywords | groq (un análisis en caché solo vale para el mismo origen). */
    public function source(): string;
}
