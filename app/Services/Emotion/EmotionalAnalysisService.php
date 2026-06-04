<?php

namespace App\Services\Emotion;

use App\Models\EmotionalAnalysis;
use App\Models\Project;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class EmotionalAnalysisService
{
    public function analyze(string $text): array
    {
        $normalized = Str::lower($text);

        $scores = [
            'joy' => $this->score($normalized, ['hope', 'joy', 'victory', 'friend', 'celebration', 'luz']),
            'fear' => $this->score($normalized, ['fear', 'terror', 'dark', 'threat', 'monster', 'miedo']),
            'anger' => $this->score($normalized, ['rage', 'betrayal', 'revenge', 'war', 'furia', 'ira']),
            'sadness' => $this->score($normalized, ['loss', 'grief', 'alone', 'death', 'tristeza', 'duelo']),
            'tension' => $this->score($normalized, ['conflict', 'choice', 'risk', 'secret', 'conflicto', 'riesgo']),
        ];

        arsort($scores);

        $dominantEmotion = array_key_first($scores) ?: 'tension';
        $topScore = max(1, reset($scores) ?: 1);

        return [
            'dominant_emotion' => $dominantEmotion,
            'valence' => $this->valenceFor($dominantEmotion),
            'arousal' => min(1, 0.35 + ($topScore * 0.15)),
            'dominance' => $dominantEmotion === 'fear' ? 0.35 : 0.6,
            'emotion_scores' => $scores,
            'interpretation' => 'Analisis simulado basado en palabras clave. Sirve como marcador inicial, no como juicio definitivo.',
            'suggestions' => [
                'Revisar si el tono emocional coincide con el arco narrativo esperado.',
                'Agregar contraste emocional si la escena se siente plana.',
            ],
        ];
    }

    public function createFor(Project $project, Model $analyzable, string $text): EmotionalAnalysis
    {
        return $project->emotionalAnalyses()->create([
            ...$this->analyze($text),
            'analyzable_type' => $analyzable::class,
            'analyzable_id' => $analyzable->getKey(),
            'input_text' => $text,
        ]);
    }

    private function score(string $text, array $keywords): int
    {
        return collect($keywords)->sum(fn (string $keyword) => Str::contains($text, $keyword) ? 1 : 0);
    }

    private function valenceFor(string $emotion): float
    {
        return match ($emotion) {
            'joy' => 0.75,
            'fear', 'anger', 'sadness' => -0.55,
            default => 0.05,
        };
    }
}
