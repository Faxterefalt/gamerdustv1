<?php

namespace Tests\Feature;

use App\Models\CharacterEmotionalState;
use App\Models\NarrativeValidation;
use App\Models\Project;
use App\Models\User;
use App\Services\Branching\BranchingStateEvaluator;
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
        // Inicio y finales declarados: los finales no avisan de "sin salida".
        $this->assertSame($nodes->firstWhere('title', 'Llegada a la sala común')->id, $inspection['start_node_id']);
        $this->assertSame(1, $nodes->where('is_start', true)->count());
        $endings = $nodes->where('is_ending', true);
        $this->assertEqualsCanonicalizing(['Descenso con testigos', 'El juicio de Tomás', 'Pacto de silencio'], $endings->pluck('title')->all());
        $this->assertCount(0, collect($inspection['warnings'])->where('code', 'no_outgoing')->whereIn('node_id', $endings->pluck('id')));

        $broken = collect($inspection['warnings'])->where('code', 'broken_option');
        $this->assertCount(1, $broken);
        $this->assertCount(0, collect($inspection['warnings'])->where('code', 'isolated'));
        $this->assertCount(0, collect($inspection['warnings'])->where('code', 'unreachable'));

        // Las referencias {{Título}} de la confesión crearon opciones administradas hacia los tres finales.
        $confession = $nodes->firstWhere('title', 'Confesión en la terraza');
        $this->assertCount(3, $confession->options->whereNotNull('source_ref'));
    }

    public function test_las_variables_hacen_jugable_la_guardia_sola(): void
    {
        $project = $this->seedProject();
        $this->assertEqualsCanonicalizing(['confianza_cordada', 'confianza_lucia', 'cabo_escondido'], $project->branchingVariables()->pluck('key')->all());

        $evaluator = app(BranchingStateEvaluator::class);
        $option = fn (string $text) => $project->dialogueNodes()->with('options')->get()->flatMap->options->firstWhere('player_option', $text);
        $alone = $option('Hacer la guardia sola');
        $state = $evaluator->initialState($project->branchingVariables()->get()->map->only(['key', 'type', 'initial_value']));

        // Sin ganarse al grupo, la guardia sola no aparece; tras "Dejarlo estar por ahora" (+1), sí.
        $this->assertSame(['var' => 'confianza_cordada', 'op' => '>=', 'value' => 1], $alone->condition);
        $this->assertFalse($evaluator->isAvailable($alone->condition, $state));
        $state = $evaluator->apply($option('Dejarlo estar por ahora')->effects, $state);
        $this->assertTrue($evaluator->isAvailable($alone->condition, $state));

        // Presionar a Marcos la cierra de nuevo.
        $state = $evaluator->apply($option('Presionar: «¿Qué le pasó a la cuerda?»')->effects, $state);
        $this->assertFalse($evaluator->isAvailable($alone->condition, $state));
        $this->assertTrue($evaluator->apply($option('Esconder el cabo y esperar')->effects, $state)['cabo_escondido']);
    }

    public function test_incluye_una_editora_y_un_lector_de_ejemplo(): void
    {
        // Idempotente también con el equipo: los usuarios se reutilizan y los miembros caen con el proyecto.
        $this->seedProject();
        $project = $this->seedProject();
        $this->assertSame(1, User::where('email', 'lector@example.com')->count());

        $roles = $project->members()->with('user')->get()->mapWithKeys(fn ($member) => [$member->user->email => $member->role])->all();
        $this->assertSame(['editora@example.com' => 'editor', 'lector@example.com' => 'viewer'], $roles);

        $reader = User::where('email', 'lector@example.com')->firstOrFail();
        $this->actingAs($reader)->get("/projects/{$project->id}/script")->assertOk();
        $this->actingAs($reader)->postJson("/projects/{$project->id}/branching/nodes", ['title' => 'X'])->assertForbidden();
        $this->actingAs(User::where('email', 'editora@example.com')->firstOrFail())->get('/projects')
            ->assertInertia(fn ($page) => $page->where('projects.data.0.role', 'editor'));
    }
}
