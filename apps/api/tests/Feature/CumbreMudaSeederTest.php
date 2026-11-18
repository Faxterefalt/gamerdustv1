<?php

namespace Tests\Feature;

use App\Models\CharacterEmotionalState;
use App\Models\NarrativeValidation;
use App\Models\Project;
use App\Models\User;
use App\Services\Branching\GraphInspector;
use App\Services\Emotion\EmotionTimelineService;
use App\Services\Emotion\SceneEmotionService;
use App\Services\Narrative\NarrativeValidationService;
use App\Services\Narrative\ProductionUsage;
use Database\Seeders\CumbreMudaSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CumbreMudaSeederTest extends TestCase
{
    use RefreshDatabase;

    private function seedProject(): Project
    {
        $this->seed(CumbreMudaSeeder::class);

        return Project::where('title', CumbreMudaSeeder::TITLE)->firstOrFail();
    }

    public function test_crea_el_proyecto_de_demostracion_completo_para_el_usuario_de_pruebas(): void
    {
        $project = $this->seedProject();

        $this->assertSame(User::where('email', 'test@example.com')->value('id'), $project->user_id);
        $this->assertSame('Aventura', $project->game_genre); // portada de montaña, distinta a la del resto
        $this->assertTrue($project->favorite);
        $this->assertCount(4, $project->characters);
        $this->assertCount(3, $project->scenes);
        $this->assertCount(4, $project->mechanics);
        $this->assertCount(16, $project->dialogueNodes);

        // Cada escena tiene guion, ubicación, los 4 personajes y varias versiones.
        foreach ($project->scenes as $scene) {
            $this->assertGreaterThan(10, count($scene->script));
            $this->assertNotNull($scene->location_id);
            $this->assertCount(4, $scene->characters);
            $this->assertGreaterThanOrEqual(3, $scene->versions()->count());
        }
    }

    public function test_es_idempotente(): void
    {
        $this->seedProject();
        $project = $this->seedProject();

        $this->assertSame(1, Project::where('title', CumbreMudaSeeder::TITLE)->count());
        $this->assertCount(3, $project->scenes);
    }

    public function test_la_evolucion_emocional_se_nota_y_tiene_alertas(): void
    {
        $project = $this->seedProject();
        $timeline = app(EmotionTimelineService::class)->build($project);

        $scenes = collect($timeline['scenes']);
        $this->assertTrue($scenes->every(fn (array $scene) => $scene['analyzed'] && ! $scene['stale']), 'Los análisis deben coincidir con el contenido guardado.');
        $this->assertSame(['calm', 'fear', 'hope'], $scenes->pluck('emotion')->all());
        // Arco: el tono cae en el nudo y se recupera en el desenlace.
        $tone = $scenes->pluck('vad.v');
        $this->assertGreaterThan(0.5, $tone[0]);
        $this->assertLessThan(0.2, $tone[1]);
        $this->assertGreaterThan(0.6, $tone[2]);

        $this->assertCount(4, $timeline['characters']);
        // Alertas rojas deliberadas: salto de la escena final y perdón de Tomás.
        $this->assertCount(2, $timeline['reviews']);
        // Personajes que actúan fuera de su ficha: Irene (E01), Tomás y Lucía (E02) y Tomás (E03).
        $this->assertSame(4, CharacterEmotionalState::where('out_of_character', true)->count());
    }

    public function test_incluye_al_menos_cuatro_contradicciones_con_alternativas(): void
    {
        $project = $this->seedProject();
        $service = app(SceneEmotionService::class);

        $inconsistencies = 0;
        foreach ($project->scenes as $scene) {
            $analysis = $service->latest($scene);
            $this->assertNotNull($analysis);
            $inconsistencies += count($analysis['inconsistencies']);
            $this->assertCount(3, $analysis['suggestions']);
        }

        $this->assertGreaterThanOrEqual(4, $inconsistencies);

        // También las detecta la validación de coherencia de la Biblia (reglas irrompibles rotas y coste sin definir).
        app(NarrativeValidationService::class)->run($project);
        $types = NarrativeValidation::where('project_id', $project->id)->pluck('validation_type');
        $this->assertSame(2, $types->filter(fn ($type) => $type === 'unbreakable_rule_broken')->count());
        $this->assertContains('rule_without_consequence', $types->all());

        // Restricciones de producción: el demo cabe en sus límites y solo pide revisar el giro.
        $this->assertSame([], array_values(array_intersect(['character_limit_exceeded', 'page_limit_exceeded', 'budget_exceeded'], $types->all())));
        $this->assertContains('twist_review', $types->all());
        $usage = app(ProductionUsage::class)->for($project);
        $this->assertSame($project->constraint->max_characters, $usage['characters']);
        $this->assertLessThanOrEqual($project->constraint->max_budget, $usage['cost_points']);
    }

    public function test_el_grafo_tiene_decisiones_y_una_opcion_rota_deliberada(): void
    {
        $project = $this->seedProject();
        $nodes = $project->dialogueNodes()->with('options')->get();

        $inspection = app(GraphInspector::class)->inspect($nodes);
        $this->assertSame($nodes->min('id'), $inspection['start_node_id']);

        $broken = collect($inspection['warnings'])->where('code', 'broken_option');
        $this->assertCount(1, $broken);
        $this->assertCount(0, collect($inspection['warnings'])->where('code', 'isolated'));

        // Las referencias {{Título}} de la confesión crearon opciones administradas hacia los tres finales.
        $confession = $nodes->firstWhere('title', 'Confesión en la terraza');
        $this->assertCount(3, $confession->options->whereNotNull('source_ref'));
    }
}
