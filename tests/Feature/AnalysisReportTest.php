<?php

namespace Tests\Feature;

use App\Models\Character;
use App\Models\Project;
use App\Models\Scene;
use App\Models\User;
use App\Services\Script\ScriptService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AnalysisReportTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Project $project;

    private Character $mara;

    /** @var list<Scene> */
    private array $scenes = [];

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'app.locale' => 'es',
            'gamerdust.ai.driver' => 'groq',
            'services.groq.key' => 'test-secret-key',
        ]);

        $this->user = User::factory()->create();
        $this->project = $this->user->projects()->create(['title' => 'Faro', 'game_genre' => 'Aventura', 'language' => 'es', 'narrative_type' => 'linear']);
        $this->mara = $this->project->characters()->create(['name' => 'Mara', 'initial_emotion' => 'hope', 'initial_intensity' => 'high']);

        $script = app(ScriptService::class);
        foreach (['La huida', 'El faro'] as $title) {
            $scene = $script->createScene($this->project, $title, 'Acto I', $this->user->id);
            $this->scenes[] = $script->save($scene, [['id' => '1', 'kind' => 'action', 'text' => "Mara en {$title}."]], [$this->mara->id], null, $this->user->id);
        }

        Http::fake(['api.groq.com/*' => Http::response([
            'choices' => [['message' => ['content' => json_encode([
                'scene' => ['v' => 0.1, 'a' => 0.85, 'd' => 0.15, 'emotion' => 'fear', 'summary' => 'La escena se vuelve opresiva.', 'evidence' => 'Mara', 'change_justified' => false, 'change_explanation' => ''],
                'characters' => [
                    ['character_id' => $this->mara->id, 'name' => 'Mara', 'v' => 0.1, 'a' => 0.85, 'd' => 0.15, 'emotion' => 'fear', 'evidence' => 'Mara tiembla', 'out_of_character' => false, 'out_of_character_reason' => '', 'change_justified' => false, 'change_explanation' => 'Pasa de la esperanza al miedo sin motivo.'],
                ],
                'inconsistencies' => [
                    ['fragment' => 'Mara vuela', 'contradicts' => 'La gravedad', 'explanation' => 'Nadie puede volar en este mundo.', 'severity' => 'high'],
                ],
                'suggestions' => [
                    ['kind' => 'pacing', 'text' => 'Añade una pausa antes del grito.', 'why' => 'El salto es brusco.'],
                ],
            ])], 'finish_reason' => 'stop']],
            'usage' => ['prompt_tokens' => 10, 'completion_tokens' => 10, 'total_tokens' => 20],
        ])]);
    }

    public function test_el_reporte_imprime_metricas_alertas_incoherencias_sugerencias_y_version_sin_vad(): void
    {
        $this->analyze($this->scenes[0]);
        Http::fake(fn () => throw new \RuntimeException('El reporte no debe llamar a la IA.'));

        $html = $this->actingAs($this->user)->get($this->url())->assertOk()->getContent();

        // Métricas en lenguaje narrativo.
        $this->assertStringContainsString('Reporte de análisis', $html);
        $this->assertStringContainsString('Faro', $html);
        $this->assertStringContainsString('Miedo', $html);
        $this->assertStringContainsString('Muy negativo', $html);
        $this->assertStringContainsString('La escena se vuelve opresiva.', $html);
        // Alerta roja de Mara (de esperanza a miedo sin causa).
        $this->assertStringContainsString('Salto sin causa visible', $html);
        $this->assertStringContainsString('Pasa de la esperanza al miedo sin motivo.', $html);
        // Incoherencias y sugerencias.
        $this->assertStringContainsString('Nadie puede volar en este mundo.', $html);
        $this->assertStringContainsString('Añade una pausa antes del grito.', $html);
        // Versión analizada y estado.
        $versionId = $this->scenes[0]->versions()->value('id');
        $this->assertStringContainsString("Versión n.º {$versionId}", $html);
        $this->assertStringContainsString('Versión actual', $html);
        $this->assertStringContainsString('Aún sin analizar.', $html);

        // "VAD invisible": ni la sigla, ni los nombres de las dimensiones, ni sus valores.
        // Palabra completa: "motivada" o "privado" no cuentan.
        $this->assertDoesNotMatchRegularExpression('/\bVAD\b|\bvalencia\b|\bvalence\b|\barousal\b|\bdominan(ce|cia)\b|0[.,]85|0[.,]15/iu', $html);
    }

    public function test_editar_la_escena_marca_el_analisis_como_desactualizado(): void
    {
        $this->analyze($this->scenes[0]);
        app(ScriptService::class)->save($this->scenes[0], [['id' => '2', 'kind' => 'action', 'text' => 'Otro texto.']], [$this->mara->id], null, $this->user->id);

        $this->actingAs($this->user)->get($this->url())
            ->assertOk()
            ->assertSee('Desactualizado')
            ->assertDontSee('Versión actual');
    }

    public function test_las_validaciones_aparecen_agrupadas_por_estado(): void
    {
        // La regla "personaje sin motivación" crea una pendiente; se descarta y otra queda resuelta.
        $this->project->characters()->create(['name' => 'Íker']);
        $this->actingAs($this->user)->get("/projects/{$this->project->id}")->assertOk();
        $validation = $this->project->narrativeValidations()->where('validation_type', 'character_without_motivation')->firstOrFail();
        $validation->update(['status' => 'dismissed']);

        $html = $this->actingAs($this->user)->get($this->url())->assertOk()->getContent();

        $this->assertStringContainsString('Validaciones de coherencia por estado', $html);
        $this->assertMatchesRegularExpression('/Descartada \(\d+\)/', $html);
        $this->assertStringContainsString(e($validation->message), $html);
        // El descarte se respeta: el reporte no la vuelve a crear como pendiente.
        $this->assertSame(0, $this->project->narrativeValidations()->where('validation_type', 'character_without_motivation')->where('subject_id', $validation->subject_id)->where('status', 'pending')->count());
    }

    public function test_el_reporte_no_incluye_datos_de_otros_proyectos_y_exige_acceso(): void
    {
        $this->analyze($this->scenes[0]);

        $other = User::factory()->create();
        $foreign = $other->projects()->create(['title' => 'Ajeno', 'language' => 'es']);
        $scene = app(ScriptService::class)->createScene($foreign, 'Escena secreta ajena', 'Acto I', $other->id);
        app(ScriptService::class)->save($scene, [['id' => '1', 'kind' => 'action', 'text' => 'Texto ajeno.']], [], null, $other->id);
        $this->actingAs($other)->postJson("/projects/{$foreign->id}/script/scenes/{$scene->id}/analyze")->assertOk();

        $this->actingAs($this->user)->get($this->url())
            ->assertOk()
            ->assertDontSee('Escena secreta ajena')
            ->assertDontSee('Ajeno');

        $this->actingAs($other)->get($this->url())->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->get($this->url())->assertRedirect('/login');
    }

    public function test_reportes_ofrece_el_reporte_de_analisis(): void
    {
        $this->actingAs($this->user)->get("/projects/{$this->project->id}/reports")->assertOk();
        $this->assertStringContainsString('/reports/analysis', file_get_contents(resource_path('js/features/reports/pages/Index.tsx')));
    }

    private function analyze(Scene $scene): void
    {
        $this->actingAs($this->user)->postJson("/projects/{$this->project->id}/script/scenes/{$scene->id}/analyze")->assertOk();
    }

    private function url(): string
    {
        return "/projects/{$this->project->id}/reports/analysis";
    }
}
