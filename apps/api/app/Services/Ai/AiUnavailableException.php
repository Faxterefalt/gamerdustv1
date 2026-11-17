<?php

namespace App\Services\Ai;

use RuntimeException;

/**
 * La IA no respondió (sin clave, límite de uso, error del servidor o respuesta inválida
 * con ambos modelos). Quien llama decide si degrada o muestra un aviso amable.
 */
class AiUnavailableException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly bool $retriable = false,
        public readonly ?int $generationId = null,
    ) {
        parent::__construct($message);
    }

    public static function notConfigured(): self
    {
        return new self('groq_not_configured');
    }

    public function withGeneration(?int $generationId): self
    {
        return new self($this->getMessage(), $this->retriable, $generationId);
    }
}
