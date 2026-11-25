<?php

namespace Tests\Feature\Ai;

use App\Models\AiGeneration;
use App\Models\Project;
use App\Models\User;
use App\Services\Ai\AiUnavailableException;
use App\Services\Ai\GroqClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GroqClientTest extends TestCase
{
    use RefreshDatabase;

    private const URL = 'https://api.groq.com/openai/v1/chat/completions';

    private User $user;

    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.groq.key' => 'test-secret-key',
            'services.groq.model' => 'primary-model',
            'services.groq.fallback_model' => 'fallback-model',
        ]);

        $this->user = User::factory()->create();
        $this->project = $this->user->projects()->create(['title' => 'Faro', 'game_genre' => 'adventure']);
    }

    public function test_envia_la_peticion_con_esquema_estricto_y_registra_la_generacion(): void
    {
        Http::fake([self::URL => Http::response($this->completion(['ok' => true]))]);

        $response = $this->client()->chatJson('system', 'user message', $this->schema(), 'check', 500, $this->log());

        $this->assertSame(['ok' => true], $response->data);
        $this->assertSame('primary-model', $response->model);
        $this->assertSame('ok', $response->status);
        $this->assertSame(120, $response->totalTokens);

        Http::assertSent(fn (Request $request) => $request->hasHeader('Authorization', 'Bearer test-secret-key')
            && $request['model'] === 'primary-model'
            && $request['max_completion_tokens'] === 500
            && $request['reasoning_effort'] === 'low'
            && $request['include_reasoning'] === false
            && $request['response_format']['type'] === 'json_schema'
            && $request['response_format']['json_schema']['strict'] === true
            && $request['response_format']['json_schema']['name'] === 'check');

        $generation = AiGeneration::sole();
        $this->assertSame($response->generationId, $generation->id);
        $this->assertSame('scene_analysis', $generation->generation_type);
        $this->assertSame('ok', $generation->status);
        $this->assertSame('user message', $generation->prompt);
        $this->assertSame(['ok' => true], $generation->response);
        $this->assertSame(100, $generation->prompt_tokens);
        $this->assertSame(64, strlen($generation->input_hash));
        $this->assertNotNull($generation->latency_ms);
        $this->assertStringNotContainsString('test-secret-key', json_encode($generation->getAttributes()));
    }

    public function test_el_limite_de_peticiones_del_modelo_principal_pasa_al_de_respaldo(): void
    {
        Http::fakeSequence()
            ->push(['error' => ['message' => 'Rate limit reached', 'type' => 'tokens']], 429)
            ->push($this->completion(['ok' => true]));

        $response = $this->client()->chatJson('s', 'u', $this->schema(), 'check', null, $this->log());

        $this->assertSame('fallback-model', $response->model);
        $this->assertSame('fallback', $response->status);
        $this->assertSame('fallback', AiGeneration::sole()->status);

        $models = Http::recorded()->map(fn (array $pair) => $pair[0]['model'])->all();
        $this->assertSame(['primary-model', 'fallback-model'], $models);
    }

    public function test_un_fallo_de_esquema_o_un_json_invalido_se_reintentan(): void
    {
        Http::fakeSequence()
            ->push(['error' => ['message' => 'Generated JSON does not match the expected schema.', 'code' => 'json_validate_failed']], 400)
            ->push($this->completion(['ok' => true]))
            ->push(['choices' => [['message' => ['content' => '{"ok": tr'], 'finish_reason' => 'length']]])
            ->push($this->completion(['ok' => true]));

        // Fallo de esquema (400) en el principal → respaldo.
        $this->assertSame('fallback', $this->client()->chatJson('s', 'u', $this->schema(), 'check')->status);
        // Salida truncada que no se puede decodificar → respaldo.
        $this->assertSame('fallback', $this->client()->chatJson('s', 'u', $this->schema(), 'check')->status);
        Http::assertSentCount(4);
    }

    public function test_un_tiempo_agotado_se_reintenta_con_el_modelo_de_respaldo(): void
    {
        Http::fakeSequence()
            ->pushFailedConnection()
            ->push($this->completion(['ok' => true]));

        $this->assertSame('fallback-model', $this->client()->chatJson('s', 'u', $this->schema(), 'check')->model);
    }

    public function test_si_fallan_ambos_modelos_lanza_una_excepcion_y_registra_el_error(): void
    {
        Http::fake([self::URL => Http::response(['error' => ['message' => 'down']], 503)]);

        try {
            $this->client()->chatJson('s', 'u', $this->schema(), 'check', null, $this->log());
            $this->fail('Se esperaba AiUnavailableException.');
        } catch (AiUnavailableException $exception) {
            $generation = AiGeneration::sole();
            $this->assertSame($generation->id, $exception->generationId);
            $this->assertSame('error', $generation->status);
            $this->assertSame('http_503', $generation->error);
            $this->assertNull($generation->response);
        }

        Http::assertSentCount(2);
    }

    public function test_los_errores_de_autenticacion_no_se_reintentan(): void
    {
        Http::fake([self::URL => Http::response(['error' => ['message' => 'Invalid API Key']], 401)]);

        $this->expectException(AiUnavailableException::class);

        try {
            $this->client()->chatJson('s', 'u', $this->schema(), 'check');
        } finally {
            Http::assertSentCount(1);
        }
    }

    public function test_sin_clave_de_api_no_se_hace_ninguna_peticion(): void
    {
        config(['services.groq.key' => '']);
        Http::fake();

        $this->assertFalse($this->client()->isConfigured());

        try {
            $this->client()->chatJson('s', 'u', $this->schema(), 'check');
            $this->fail('Se esperaba AiUnavailableException.');
        } catch (AiUnavailableException $exception) {
            $this->assertSame('groq_not_configured', $exception->getMessage());
        }

        Http::assertNothingSent();
    }

    public function test_marcar_como_degradado_actualiza_el_estado_registrado(): void
    {
        Http::fake([self::URL => Http::response(['error' => ['message' => 'down']], 500)]);

        try {
            $this->client()->chatJson('s', 'u', $this->schema(), 'check', null, $this->log());
        } catch (AiUnavailableException $exception) {
            $this->client()->markDegraded($exception->generationId);
        }

        $this->assertSame('degraded', AiGeneration::sole()->status);
    }

    public function test_el_comando_groq_check_informa_que_todo_va_bien(): void
    {
        Http::fake([self::URL => Http::response($this->completion(['ok' => true, 'word' => 'gamerdust']))]);

        $this->artisan('gamerdust:groq-check')->expectsOutputToContain('OK')->assertSuccessful();
        $this->assertSame(0, AiGeneration::count());
    }

    public function test_el_comando_groq_check_falla_sin_clave(): void
    {
        config(['services.groq.key' => null]);
        Http::fake();

        $this->artisan('gamerdust:groq-check')->assertFailed();
        Http::assertNothingSent();
    }

    public function test_el_entorno_de_pruebas_no_tiene_una_clave_real(): void
    {
        $this->assertSame('', (string) env('GROQ_API_KEY'));
        $this->assertSame('keywords', config('gamerdust.ai.driver'));
    }

    private function client(): GroqClient
    {
        return app(GroqClient::class);
    }

    private function log(): array
    {
        return ['project_id' => $this->project->id, 'user_id' => $this->user->id, 'type' => 'scene_analysis'];
    }

    private function schema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['ok'],
            'properties' => ['ok' => ['type' => 'boolean']],
        ];
    }

    private function completion(array $content): array
    {
        return [
            'choices' => [['message' => ['role' => 'assistant', 'content' => json_encode($content)], 'finish_reason' => 'stop']],
            'usage' => ['prompt_tokens' => 100, 'completion_tokens' => 20, 'total_tokens' => 120],
        ];
    }
}
