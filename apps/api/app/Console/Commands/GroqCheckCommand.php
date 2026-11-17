<?php

namespace App\Console\Commands;

use App\Services\Ai\AiUnavailableException;
use App\Services\Ai\GroqClient;
use Illuminate\Console\Command;

/**
 * Llamada real mínima a Groq para comprobar la clave y los modelos configurados.
 * No registra nada en ai_generations y nunca muestra la clave.
 */
class GroqCheckCommand extends Command
{
    protected $signature = 'gamerdust:groq-check {--model= : Probar solo este modelo (sin respaldo)}';

    protected $description = 'Comprueba la conexión con Groq (modelo, tokens y latencia)';

    public function handle(GroqClient $groq): int
    {
        if (! $groq->isConfigured()) {
            $this->error('GROQ_API_KEY no está definida en apps/api/.env.');

            return self::FAILURE;
        }

        if ($model = $this->option('model')) {
            config(['services.groq.model' => $model, 'services.groq.fallback_model' => null]);
        }

        $schema = [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['ok', 'word'],
            'properties' => [
                'ok' => ['type' => 'boolean'],
                'word' => ['type' => 'string'],
            ],
        ];

        try {
            $response = $groq->chatJson(
                'Respond only with the requested JSON.',
                'Return ok=true and word="gamerdust".',
                $schema,
                'groq_check',
                400,
            );
        } catch (AiUnavailableException $exception) {
            $this->error('Groq no respondió: '.$exception->getMessage());

            return self::FAILURE;
        }

        $this->table(['Modelo', 'Estado', 'Tokens (entrada/salida/total)', 'Latencia'], [[
            $response->model,
            $response->status,
            "{$response->promptTokens}/{$response->completionTokens}/{$response->totalTokens}",
            "{$response->latencyMs} ms",
        ]]);

        if (($response->data['ok'] ?? false) !== true) {
            $this->warn('Respuesta inesperada: '.json_encode($response->data));

            return self::FAILURE;
        }

        $this->info('OK');

        return self::SUCCESS;
    }
}
