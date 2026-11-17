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

    public function test_sends_strict_schema_request_and_logs_the_generation(): void
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

    public function test_rate_limit_on_primary_falls_back_to_secondary_model(): void
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

    public function test_schema_validation_failure_and_invalid_json_are_retried(): void
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

    public function test_timeout_is_retried_with_the_fallback_model(): void
    {
        Http::fakeSequence()
            ->pushFailedConnection()
            ->push($this->completion(['ok' => true]));

        $this->assertSame('fallback-model', $this->client()->chatJson('s', 'u', $this->schema(), 'check')->model);
    }

    public function test_both_models_failing_throws_and_logs_an_error(): void
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

    public function test_authentication_errors_are_not_retried(): void
    {
        Http::fake([self::URL => Http::response(['error' => ['message' => 'Invalid API Key']], 401)]);

        $this->expectException(AiUnavailableException::class);

        try {
            $this->client()->chatJson('s', 'u', $this->schema(), 'check');
        } finally {
            Http::assertSentCount(1);
        }
    }

    public function test_without_api_key_no_request_is_made(): void
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

    public function test_mark_degraded_updates_the_logged_status(): void
    {
        Http::fake([self::URL => Http::response(['error' => ['message' => 'down']], 500)]);

        try {
            $this->client()->chatJson('s', 'u', $this->schema(), 'check', null, $this->log());
        } catch (AiUnavailableException $exception) {
            $this->client()->markDegraded($exception->generationId);
        }

        $this->assertSame('degraded', AiGeneration::sole()->status);
    }

    public function test_groq_check_command_reports_ok(): void
    {
        Http::fake([self::URL => Http::response($this->completion(['ok' => true, 'word' => 'gamerdust']))]);

        $this->artisan('gamerdust:groq-check')->expectsOutputToContain('OK')->assertSuccessful();
        $this->assertSame(0, AiGeneration::count());
    }

    public function test_groq_check_command_fails_without_key(): void
    {
        config(['services.groq.key' => null]);
        Http::fake();

        $this->artisan('gamerdust:groq-check')->assertFailed();
        Http::assertNothingSent();
    }

    public function test_test_environment_has_no_real_key(): void
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
