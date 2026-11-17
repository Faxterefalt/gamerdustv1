<?php

namespace App\Services\Ai;

/**
 * Respuesta ya decodificada de una llamada con salida JSON estructurada.
 * El contenido aún debe validarse en PHP (el modo estricto puede fallar de forma intermitente).
 */
final class AiResponse
{
    /**
     * @param  array<string, mixed>  $data
     * @param  string  $status  ok (modelo principal) | fallback (modelo de respaldo)
     */
    public function __construct(
        public readonly array $data,
        public readonly string $model,
        public readonly string $status,
        public readonly ?int $promptTokens,
        public readonly ?int $completionTokens,
        public readonly ?int $totalTokens,
        public readonly int $latencyMs,
        public readonly ?int $generationId = null,
    ) {}
}
