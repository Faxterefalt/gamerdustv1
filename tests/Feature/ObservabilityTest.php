<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use App\Services\Script\ScriptService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Monolog\Handler\TestHandler;
use Monolog\LogRecord;
use RuntimeException;
use Tests\TestCase;

class ObservabilityTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET_TEXT = 'El faro guarda el secreto de Mara';

    private TestHandler $handler;

    private User $user;

    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();

        // El canal gamerdust se redirige a memoria para leer lo que se registra.
        $this->handler = new TestHandler;
        config(['logging.channels.gamerdust' => ['driver' => 'monolog', 'handler' => TestHandler::class]]);
        Log::forgetChannel('gamerdust');
        Log::channel('gamerdust')->getLogger()->setHandlers([$this->handler]);

        config([
            'app.locale' => 'es',
            'gamerdust.ai.driver' => 'groq',
            'services.groq.key' => 'test-secret-key',
            'services.groq.model' => 'primary-model',
            'services.groq.fallback_model' => 'fallback-model',
        ]);

        $this->user = User::factory()->create();
        $this->project = $this->user->projects()->create(['title' => 'Faro', 'language' => 'es']);
    }

    public function test_un_fallo_de_la_ia_queda_en_el_canal_gamerdust_sin_clave_ni_texto_narrativo(): void
    {
        Http::fake(['api.groq.com/*' => Http::response(['error' => ['message' => 'Overloaded: '.self::SECRET_TEXT]], 503)]);
        $script = app(ScriptService::class);
        $scene = $script->createScene($this->project, 'El faro', 'Acto I', $this->user->id);
        $scene = $script->save($scene, [['id' => '1', 'kind' => 'action', 'text' => self::SECRET_TEXT]], [], null, $this->user->id);

        // El análisis se degrada a palabras clave: la edición no se bloquea.
        $this->actingAs($this->user)
            ->postJson("/projects/{$this->project->id}/script/scenes/{$scene->id}/analyze")
            ->assertOk()
            ->assertJsonPath('analysis.degraded', true);

        $events = $this->events();
        $this->assertContains('ai.attempt_failed', $events);
        $this->assertContains('ai.unavailable', $events);
        $this->assertContains('ai.degraded', $events);

        $unavailable = $this->record('ai.unavailable');
        $this->assertSame('error', strtolower($unavailable->level->getName()));
        $this->assertSame($this->project->id, $unavailable->context['project_id']);
        $this->assertSame('scene_analysis', $unavailable->context['type']);
        $this->assertSame('http_503', $unavailable->context['reason']);
        $this->assertIsInt($unavailable->context['generation_id']);

        $this->assertLogIsClean();
    }

    public function test_una_respuesta_invalida_de_refinar_se_registra_como_invalid_output(): void
    {
        Http::fake(['api.groq.com/*' => Http::response([
            'choices' => [['message' => ['content' => json_encode(['otra' => self::SECRET_TEXT])], 'finish_reason' => 'stop']],
            'usage' => ['prompt_tokens' => 1, 'completion_tokens' => 1, 'total_tokens' => 2],
        ])]);
        $scene = app(ScriptService::class)->createScene($this->project, 'El faro', 'Acto I', $this->user->id);

        $this->actingAs($this->user)
            ->postJson("/projects/{$this->project->id}/script/scenes/{$scene->id}/refine", [
                'block' => ['id' => '1', 'kind' => 'action', 'text' => self::SECRET_TEXT],
                'goal' => 'clearer',
            ])
            ->assertStatus(503);

        $this->assertContains('ai.invalid_output', $this->events());
        // El 503 también queda como error de servidor (aviso, no error).
        $http = $this->record('http.server_error');
        $this->assertSame(503, $http->context['status']);
        $this->assertSame('warning', strtolower($http->level->getName()));
        $this->assertLogIsClean();
    }

    public function test_un_error_500_registra_ruta_estado_usuario_y_excepcion_sin_su_mensaje(): void
    {
        Route::middleware('web')->get('/_prueba/fallo/{project}', fn () => throw new RuntimeException('SQL: '.self::SECRET_TEXT))->name('prueba.fallo');

        $this->actingAs($this->user)->get("/_prueba/fallo/{$this->project->id}?texto=".urlencode(self::SECRET_TEXT))->assertStatus(500);

        $record = $this->record('http.server_error');
        $this->assertSame('error', strtolower($record->level->getName()));
        $this->assertSame([
            'method' => 'GET',
            'path' => "/_prueba/fallo/{$this->project->id}",
            'route' => 'prueba.fallo',
            'status' => 500,
            'user_id' => $this->user->id,
            'exception' => RuntimeException::class,
        ], array_diff_key($record->context, ['at' => true]));
        $this->assertStringContainsString('ObservabilityTest.php:', $record->context['at']);
        $this->assertLogIsClean();
    }

    public function test_las_respuestas_correctas_y_los_4xx_no_se_registran(): void
    {
        $this->actingAs($this->user)->get("/projects/{$this->project->id}")->assertOk();
        $this->actingAs(User::factory()->create())->get("/projects/{$this->project->id}")->assertForbidden();

        $this->assertSame([], $this->events());
    }

    /** @return list<string> */
    private function events(): array
    {
        return array_map(fn (LogRecord $record) => $record->message, $this->handler->getRecords());
    }

    private function record(string $event): LogRecord
    {
        foreach ($this->handler->getRecords() as $record) {
            if ($record->message === $event) {
                return $record;
            }
        }

        $this->fail("No se registró {$event}: ".implode(', ', $this->events()));
    }

    private function assertLogIsClean(): void
    {
        $dump = json_encode(array_map(fn (LogRecord $record) => $record->toArray(), $this->handler->getRecords()));

        $this->assertStringNotContainsString('test-secret-key', $dump);
        $this->assertStringNotContainsString('secreto de Mara', $dump);
        $this->assertStringNotContainsString('Overloaded', $dump);
    }
}
