<?php

namespace App\Services\Ai;

use App\Models\AiGeneration;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Cliente mínimo de Groq (API compatible con OpenAI) con salida JSON estricta.
 *
 * Ante un fallo recuperable (429, 5xx, timeout o JSON inválido) reintenta una vez con el
 * modelo de respaldo. Cada llamada con contexto de proyecto queda registrada en ai_generations.
 * Solo se invoca cuando el usuario pulsa un botón: nunca desde observers ni al guardar.
 */
class GroqClient
{
    public function isConfigured(): bool
    {
        return filled(config('services.groq.key'));
    }

    /**
     * @param  array<string, mixed>  $schema  esquema JSON (strict: todo required, additionalProperties false)
     * @param  array{project_id: int, user_id: int, type: string}|null  $log  contexto para ai_generations
     *
     * @throws AiUnavailableException
     */
    public function chatJson(string $system, string $user, array $schema, string $schemaName, ?int $maxTokens = null, ?array $log = null): AiResponse
    {
        if (! $this->isConfigured()) {
            throw AiUnavailableException::notConfigured();
        }

        $maxTokens ??= (int) config('gamerdust.ai.max_completion_tokens', 2000);
        $models = array_values(array_unique(array_filter([
            config('services.groq.model'),
            config('services.groq.fallback_model'),
        ])));
        $started = hrtime(true);
        $error = new AiUnavailableException('no_model');

        foreach ($models as $index => $model) {
            try {
                $response = $this->request($model, $system, $user, $schema, $schemaName, $maxTokens);
            } catch (AiUnavailableException $exception) {
                $error = $exception;

                if (! $exception->retriable) {
                    break;
                }

                continue;
            }

            $usage = $response->json('usage') ?? [];
            $result = [
                'data' => $this->decode($response),
                'model' => $model,
                'status' => $index === 0 ? 'ok' : 'fallback',
                'prompt_tokens' => $usage['prompt_tokens'] ?? null,
                'completion_tokens' => $usage['completion_tokens'] ?? null,
                'total_tokens' => $usage['total_tokens'] ?? null,
                'latency_ms' => $this->elapsed($started),
            ];

            return new AiResponse(
                data: $result['data'],
                model: $model,
                status: $result['status'],
                promptTokens: $result['prompt_tokens'],
                completionTokens: $result['completion_tokens'],
                totalTokens: $result['total_tokens'],
                latencyMs: $result['latency_ms'],
                generationId: $this->record($log, $user, $schemaName, $system, $result),
            );
        }

        $generationId = $this->record($log, $user, $schemaName, $system, [
            'data' => null,
            'model' => end($models) ?: null,
            'status' => 'error',
            'latency_ms' => $this->elapsed($started),
            'error' => $error->getMessage(),
        ]);

        throw $error->withGeneration($generationId);
    }

    /**
     * Marca una llamada registrada como degradada (se usó el análisis por palabras clave).
     */
    public function markDegraded(?int $generationId): void
    {
        if ($generationId) {
            AiGeneration::whereKey($generationId)->update(['status' => 'degraded']);
        }
    }

    private function request(string $model, string $system, string $user, array $schema, string $schemaName, int $maxTokens): Response
    {
        try {
            $response = Http::withToken((string) config('services.groq.key'))
                ->acceptJson()
                ->connectTimeout(5)
                ->timeout((int) config('services.groq.timeout', 15))
                ->post(rtrim((string) config('services.groq.base_url'), '/').'/chat/completions', [
                    'model' => $model,
                    'messages' => [
                        ['role' => 'system', 'content' => $system],
                        ['role' => 'user', 'content' => $user],
                    ],
                    'temperature' => (float) config('gamerdust.ai.temperature', 0.3),
                    'max_completion_tokens' => $maxTokens,
                    'reasoning_effort' => config('gamerdust.ai.reasoning_effort', 'low'),
                    // El razonamiento no se necesita: solo el JSON de message.content.
                    'include_reasoning' => false,
                    'response_format' => [
                        'type' => 'json_schema',
                        'json_schema' => ['name' => $schemaName, 'strict' => true, 'schema' => $schema],
                    ],
                ]);
        } catch (ConnectionException) {
            throw new AiUnavailableException('timeout', retriable: true);
        }

        if ($response->failed()) {
            $status = $response->status();
            $code = $response->json('error.code');
            $schemaFailure = $status === 400 && (
                $code === 'json_validate_failed'
                || Str::contains(Str::lower((string) $response->json('error.message')), 'schema')
            );

            // Solo el estado y el código: el cuerpo de la petición nunca se registra.
            throw new AiUnavailableException(
                trim('http_'.$status.' '.(is_string($code) ? $code : '')),
                retriable: $status === 429 || $status >= 500 || $schemaFailure,
            );
        }

        // Respuesta truncada o no decodificable: se trata como fallo del modo estricto.
        if ($this->decode($response) === null) {
            throw new AiUnavailableException(
                $response->json('choices.0.finish_reason') === 'length' ? 'truncated_output' : 'invalid_json',
                retriable: true,
            );
        }

        return $response;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function decode(Response $response): ?array
    {
        $content = $response->json('choices.0.message.content');
        $data = is_string($content) ? json_decode($content, true) : null;

        return is_array($data) ? $data : null;
    }

    private function record(?array $log, string $user, string $schemaName, string $system, array $result): ?int
    {
        if (! $log) {
            return null;
        }

        return AiGeneration::create([
            'project_id' => $log['project_id'],
            'user_id' => $log['user_id'],
            'generation_type' => $log['type'],
            'prompt' => $user,
            'response' => $result['data'],
            'model' => $result['model'],
            'status' => $result['status'],
            'prompt_tokens' => $result['prompt_tokens'] ?? null,
            'completion_tokens' => $result['completion_tokens'] ?? null,
            'total_tokens' => $result['total_tokens'] ?? null,
            'latency_ms' => $result['latency_ms'],
            'input_hash' => hash('sha256', $schemaName."\n".$system."\n".$user),
            'error' => $result['error'] ?? null,
        ])->id;
    }

    private function elapsed(int $started): int
    {
        return (int) round((hrtime(true) - $started) / 1_000_000);
    }
}
