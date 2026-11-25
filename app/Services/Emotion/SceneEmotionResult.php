<?php

namespace App\Services\Emotion;

/**
 * Resultado del análisis de una escena. v/a/d en escala 0-1.
 */
final class SceneEmotionResult
{
    /**
     * @param  array{v: float, a: float, d: float, emotion: string, summary: string, evidence: string}  $scene
     * @param  list<array<string, mixed>>  $characters  estado de cada personaje que actúa en la escena
     * @param  list<array{fragment: string, contradicts: string, explanation: string, severity: string}>  $inconsistencies
     * @param  list<array{kind: string, text: string, why: string}>  $suggestions
     * @param  string  $source  keywords | groq
     */
    public function __construct(
        public readonly array $scene,
        public readonly array $characters = [],
        public readonly array $inconsistencies = [],
        public readonly array $suggestions = [],
        public readonly string $source = 'keywords',
        public readonly ?string $model = null,
        public readonly bool $degraded = false,
        public readonly bool $truncated = false,
        public readonly ?int $aiGenerationId = null,
    ) {}

    public function asDegraded(?int $aiGenerationId = null): self
    {
        return new self(
            $this->scene, $this->characters, $this->inconsistencies, $this->suggestions,
            $this->source, $this->model, true, $this->truncated, $aiGenerationId ?? $this->aiGenerationId,
        );
    }

    /**
     * Forma que se guarda en emotional_analyses.result.
     */
    public function toArray(): array
    {
        return [
            'scene' => $this->scene,
            'characters' => $this->characters,
            'inconsistencies' => $this->inconsistencies,
            'suggestions' => $this->suggestions,
            'source' => $this->source,
            'model' => $this->model,
            'degraded' => $this->degraded,
            'truncated' => $this->truncated,
        ];
    }
}
