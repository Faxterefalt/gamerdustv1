<?php

namespace Tests\Feature;

use App\Models\NarrativeValidation;
use App\Models\Project;
use App\Models\User;
use App\Services\Emotion\SceneContextBuilder;
use App\Services\Emotion\ScenePrompt;
use App\Services\Narrative\NarrativeValidationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Restricciones de producción (HU 7 y 60), estado de las alertas y su evidencia (HU 51).
 */
class NarrativeValidationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();

        config(['inertia.testing.ensure_pages_exist' => false]);
        $this->user = User::factory()->create();
        $this->project = $this->user->projects()->create([
            'title' => 'Cumbre',
            'premise' => 'Una cordada atrapada por la tormenta.',
            'narrative_type' => 'branching',
        ]);
    }

    private function characters(int $count): void
    {
        foreach (range(1, $count) as $index) {
            $this->project->characters()->create(['name' => "Personaje {$index}", 'motivation' => 'Sobrevivir']);
        }
    }

    private function limits(array $limits): void
    {
        $this->actingAs($this->user)
            ->post("/projects/{$this->project->id}/constraints", $limits)
            ->assertSessionHasNoErrors();
    }

    private function types(): array
    {
        return app(NarrativeValidationService::class)->run($this->project->fresh())->pluck('validation_type')->all();
    }

    public function test_guarda_las_restricciones_y_los_vacios_significan_sin_limite(): void
    {
        $this->limits(['max_characters' => '3', 'max_pages' => '', 'max_budget' => '12.5', 'requires_twist' => true, 'assignment' => 'Demo para un concurso']);

        $constraint = $this->project->constraint()->firstOrFail();
        $this->assertSame(3, $constraint->max_characters);
        $this->assertNull($constraint->max_pages);
        $this->assertSame(12.5, $constraint->max_budget);
        $this->assertTrue($constraint->requires_twist);
        $this->assertSame('Demo para un concurso', $constraint->assignment);
    }

    public function test_rechaza_limites_negativos(): void
    {
        $this->actingAs($this->user)
            ->post("/projects/{$this->project->id}/constraints", ['max_characters' => -1, 'max_pages' => 'abc', 'max_budget' => -3])
            ->assertSessionHasErrors(['max_characters', 'max_pages', 'max_budget']);
    }

    public function test_exceder_el_maximo_de_personajes_genera_alerta_e_igualarlo_no(): void
    {
        $this->limits(['max_characters' => 3]);
        $this->characters(3);
        $this->assertNotContains('character_limit_exceeded', $this->types());

        $this->characters(1);
        $this->assertContains('character_limit_exceeded', $this->types());
    }

    public function test_sin_restricciones_no_hay_alertas_de_limites(): void
    {
        $this->characters(5);
        $this->project->scenes()->create(['title' => 'Larga', 'conflict' => 'x', 'script' => [['id' => 'a', 'kind' => 'action', 'text' => str_repeat('palabra ', 600)]]]);

        $types = $this->types();
        $this->assertEmpty(array_intersect(['character_limit_exceeded', 'page_limit_exceeded', 'budget_exceeded', 'twist_review'], $types));
    }

    public function test_las_paginas_se_estiman_por_palabras_del_guion(): void
    {
        $this->limits(['max_pages' => 2]);
        // 500 palabras = 2 páginas exactas: igualar no es exceso.
        $scene = $this->project->scenes()->create(['title' => 'E1', 'conflict' => 'x', 'script' => [['id' => 'a', 'kind' => 'action', 'text' => trim(str_repeat('palabra ', 500))]]]);
        $this->assertNotContains('page_limit_exceeded', $this->types());

        $scene->update(['script' => [...$scene->script, ['id' => 'b', 'kind' => 'dialogue', 'text' => 'Una más']]]);
        $this->assertContains('page_limit_exceeded', $this->types());
    }

    public function test_el_coste_heuristico_por_encima_del_presupuesto_genera_alerta(): void
    {
        $this->limits(['max_budget' => 1]);
        $this->project->scenes()->create(['title' => 'E1', 'conflict' => 'x']);
        $this->assertNotContains('budget_exceeded', $this->types());

        $this->project->scenes()->create(['title' => 'E2', 'conflict' => 'x', 'player_decision' => 'Huir o quedarse']);
        $this->assertContains('budget_exceeded', $this->types());
    }

    public function test_el_giro_obligatorio_es_una_revision_contextual(): void
    {
        $this->limits(['requires_twist' => true]);

        $twist = app(NarrativeValidationService::class)->run($this->project->fresh())->firstWhere('validation_type', 'twist_review');
        $this->assertSame('review', $twist->severity);
    }

    public function test_una_alerta_descartada_no_reaparece_al_volver_al_panel(): void
    {
        $this->limits(['max_characters' => 3]);
        $this->characters(4);
        $alert = collect(app(NarrativeValidationService::class)->run($this->project->fresh()))->firstWhere('validation_type', 'character_limit_exceeded');

        $this->actingAs($this->user)
            ->patch("/projects/{$this->project->id}/validations/{$alert->id}", ['status' => 'dismissed'])
            ->assertSessionHasNoErrors();

        $this->actingAs($this->user)->get("/projects/{$this->project->id}")->assertOk()->assertInertia(
            fn ($page) => $page->component('Projects/Show')
                ->where('validations', fn ($items) => collect($items)->where('validation_type', 'character_limit_exceeded')->isEmpty())
                ->where('closedValidations.0.id', $alert->id)
                ->where('closedValidations.0.status', 'dismissed')
        );
        $this->assertSame(1, NarrativeValidation::where('validation_type', 'character_limit_exceeded')->count());
    }

    public function test_una_alerta_resuelta_tampoco_reaparece_y_conserva_el_id_de_las_pendientes(): void
    {
        $this->project->update(['premise' => null]);
        $first = app(NarrativeValidationService::class)->run($this->project->fresh())->firstWhere('validation_type', 'missing_project_premise');
        $again = app(NarrativeValidationService::class)->run($this->project->fresh())->firstWhere('validation_type', 'missing_project_premise');
        $this->assertSame($first->id, $again->id);

        // Sin estado se marca como resuelta (botón Resolver).
        $this->actingAs($this->user)->patch("/projects/{$this->project->id}/validations/{$first->id}")->assertSessionHasNoErrors();

        $this->assertNotContains('missing_project_premise', $this->types());
        $this->assertSame('resolved', $first->fresh()->status);
    }

    public function test_si_la_causa_cambia_la_alerta_vuelve_a_crearse(): void
    {
        $this->limits(['max_characters' => 3]);
        $this->characters(4);
        $alert = app(NarrativeValidationService::class)->run($this->project->fresh())->firstWhere('validation_type', 'character_limit_exceeded');
        $alert->update(['status' => 'dismissed']);

        // Un quinto personaje cambia la causa (5/3): alerta nueva.
        $this->characters(1);
        $this->assertContains('character_limit_exceeded', $this->types());

        // Si la causa desaparece, la cerrada queda como histórico sin huella.
        $this->project->characters()->latest('id')->limit(2)->get()->each->delete();
        $this->assertNotContains('character_limit_exceeded', $this->types());
        $this->assertNull($alert->fresh()->fingerprint);
    }

    public function test_cada_alerta_enlaza_al_elemento_afectado(): void
    {
        $character = $this->project->characters()->create(['name' => 'Irene']);
        $scene = $this->project->scenes()->create(['title' => 'Tormenta']);
        $rule = $this->project->loreEntries()->create(['title' => 'La montaña cobra', 'type' => 'rule', 'rigidity' => 'costly', 'narrative_function' => 'x']);

        $payloads = collect(app(NarrativeValidationService::class)->panel($this->project->fresh())['validations'])->keyBy('validation_type');

        $this->assertSame("/projects/{$this->project->id}/characters?character={$character->id}", $payloads['character_without_motivation']['subject']['url']);
        $this->assertSame('Irene', $payloads['character_without_motivation']['subject']['label']);
        $this->assertSame("/projects/{$this->project->id}/script?scene={$scene->id}", $payloads['scene_without_conflict']['subject']['url']);
        $this->assertSame("/projects/{$this->project->id}/bible/rules?entry={$rule->id}", $payloads['rule_without_consequence']['subject']['url']);
    }

    public function test_no_se_puede_cambiar_el_estado_de_una_alerta_de_otro_proyecto(): void
    {
        $this->project->update(['premise' => null]);
        $alert = app(NarrativeValidationService::class)->run($this->project->fresh())->first();
        $other = $this->user->projects()->create(['title' => 'Otro']);

        $this->actingAs($this->user)->patch("/projects/{$other->id}/validations/{$alert->id}", ['status' => 'dismissed'])->assertNotFound();
        $this->actingAs(User::factory()->create())->patch("/projects/{$this->project->id}/validations/{$alert->id}", ['status' => 'dismissed'])->assertForbidden();
        $this->actingAs($this->user)->patch("/projects/{$this->project->id}/validations/{$alert->id}", ['status' => 'other'])->assertSessionHasErrors('status');
    }

    public function test_los_campos_menores_llegan_al_contexto_de_la_ia_y_al_markdown(): void
    {
        $this->limits(['assignment' => 'Encargo del estudio']);
        $character = $this->project->characters()->create(['name' => 'Irene', 'values' => 'La verdad', 'inner_conflict' => 'Callar o hablar']);
        $scene = $this->project->scenes()->create(['title' => 'E1', 'script' => [['id' => 'a', 'kind' => 'action', 'text' => 'Nieve.']]]);
        $scene->characters()->attach($character);

        $context = app(SceneContextBuilder::class)->build($scene->fresh());
        $this->assertSame('Encargo del estudio', $context['project']['essence']['assignment']);
        $this->assertSame('La verdad', $context['characters'][0]['values']);
        $this->assertSame('Callar o hablar', $context['characters'][0]['inner_conflict']);

        $lines = implode("\n", app(ScenePrompt::class)->contextLines($context));
        $this->assertStringContainsString('Encargo: Encargo del estudio', $lines);
        $this->assertStringContainsString('Conflicto interno: Callar o hablar', $lines);

        $markdown = $this->actingAs($this->user)->get("/projects/{$this->project->id}/reports/markdown")->streamedContent();
        $this->assertStringContainsString('Encargo del estudio', $markdown);
        $this->assertStringContainsString('Callar o hablar', $markdown);
    }
}
