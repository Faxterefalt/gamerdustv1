<?php

namespace Tests\Feature\Ai;

use App\Models\AiGeneration;
use App\Models\Character;
use App\Models\DialogueNode;
use App\Models\DialogueOption;
use App\Models\EmotionalAnalysis;
use App\Models\LoreEntry;
use App\Models\Project;
use App\Models\User;
use App\Services\Script\ScriptService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * IA de la fase 4: análisis de nodo (HU 45), revisión de consecuencias (HU 50), disonancias
 * ludonarrativas (HU 56) y "Usar como base" (HU 52). Nunca hay red: Http::fake().
 */
class BranchingAiTest extends TestCase
{
    use RefreshDatabase;

    private const URL = 'https://api.groq.com/openai/v1/chat/completions';

    private User $user;

    private Project $project;

    private Character $irene;

    private LoreEntry $rule;

    private DialogueNode $start;

    private DialogueNode $end;

    private DialogueOption $help;

    private DialogueOption $confess;

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.locale' => 'es']);

        $this->user = User::factory()->create();
        $this->project = $this->user->projects()->create(['title' => 'Cumbre', 'game_genre' => 'Aventura', 'language' => 'es', 'narrative_type' => 'branching', 'premise' => 'Una cuerda cortada.']);
        $this->irene = $this->project->characters()->create(['name' => 'Irene', 'personality' => 'Protectora', 'limits' => 'Nunca abandona a nadie.']);
        $this->rule = $this->project->loreEntries()->create(['title' => 'Nadie baja de noche', 'type' => 'rule', 'rigidity' => 'unbreakable', 'statement' => 'Bajar de noche es morir.']);
        $this->project->branchingVariables()->create(['key' => 'confianza', 'type' => 'number', 'initial_value' => 0]);

        $base = ['project_id' => $this->project->id, 'dialogue_type' => 'interactive_alternative_paths'];
        $this->start = DialogueNode::create([...$base, 'node_key' => 'inicio', 'title' => 'Inicio', 'text' => 'Tomás duda. Tengo miedo de lo que pasó.', 'character_id' => $this->irene->id, 'is_start' => true]);
        $this->end = DialogueNode::create([...$base, 'node_key' => 'fin', 'title' => 'Fin', 'text' => 'La verdad sale.', 'is_ending' => true]);
        $this->start->loreEntries()->attach($this->rule);
        $this->help = DialogueOption::create(['dialogue_node_id' => $this->start->id, 'next_dialogue_node_id' => $this->start->id, 'player_option' => 'Ayudarle', 'effects' => [['var' => 'confianza', 'op' => 'add', 'value' => 1]]]);
        $this->confess = DialogueOption::create(['dialogue_node_id' => $this->start->id, 'next_dialogue_node_id' => $this->end->id, 'player_option' => 'Bajar de noche', 'condition' => ['var' => 'confianza', 'op' => '>=', 'value' => 1]]);
    }

    private function groq(): void
    {
        config([
            'gamerdust.ai.driver' => 'groq',
            'services.groq.key' => 'test-secret-key',
            'services.groq.model' => 'primary-model',
            'services.groq.fallback_model' => 'fallback-model',
        ]);
    }

    private function url(string $path): string
    {
        return "/projects/{$this->project->id}{$path}";
    }

    /** Lo que se puede modificar por error: textos, opciones (con condición y efectos) y vínculos. */
    private function snapshot(): array
    {
        return [
            DialogueNode::orderBy('id')->get(['id', 'title', 'text', 'is_start', 'is_ending', 'character_id'])->toArray(),
            DialogueOption::orderBy('id')->get(['id', 'player_option', 'next_dialogue_node_id', 'condition', 'effects'])->toArray(),
            $this->start->loreEntries()->pluck('lore_entries.id')->all(),
        ];
    }

    // ── HU 45: análisis emocional del nodo ──

    public function test_sin_clave_analiza_el_nodo_por_palabras_clave_sin_red_y_sin_tocar_el_grafo(): void
    {
        Http::fake();
        $before = $this->snapshot();

        $response = $this->actingAs($this->user)->postJson($this->url("/branching/nodes/{$this->start->id}/analyze"))->assertOk();

        $response->assertJsonPath('analysis.source', 'keywords')
            ->assertJsonPath('analysis.degraded', false)
            ->assertJsonMissingPath('graph')
            ->assertJsonStructure(['analysis' => ['emotion', 'labels' => ['tone', 'tension', 'control'], 'summary', 'suggestions']]);
        $this->assertStringNotContainsString('valence', $response->getContent());
        Http::assertNothingSent();

        $analysis = EmotionalAnalysis::sole();
        $this->assertSame(DialogueNode::class, $analysis->analyzable_type);
        $this->assertSame($this->start->id, $analysis->analyzable_id);
        $this->assertNotNull($analysis->content_hash);
        $this->assertSame($before, $this->snapshot());

        // El panel recupera el último análisis sin volver a analizar.
        $this->actingAs($this->user)->getJson($this->url("/branching/nodes/{$this->start->id}/context"))
            ->assertOk()->assertJsonPath('analysis.id', $analysis->id)->assertJsonPath('analysis.stale', false)->assertJsonPath('context.lore.0.title', 'Nadie baja de noche');
    }

    public function test_reutiliza_el_analisis_si_nada_cambio_y_reanalizar_lo_rehace(): void
    {
        $this->actingAs($this->user)->postJson($this->url("/branching/nodes/{$this->start->id}/analyze"))->assertOk()->assertJsonPath('analysis.from_cache', false);
        $this->actingAs($this->user)->postJson($this->url("/branching/nodes/{$this->start->id}/analyze"))->assertOk()->assertJsonPath('analysis.from_cache', true);
        $this->assertSame(1, EmotionalAnalysis::count());

        $this->actingAs($this->user)->postJson($this->url("/branching/nodes/{$this->start->id}/analyze"), ['force' => true])->assertOk()->assertJsonPath('analysis.from_cache', false);
        $this->assertSame(2, EmotionalAnalysis::count());

        // Cambiar el texto marca el análisis como desactualizado.
        $this->start->update(['text' => 'Ahora todo es alegría.']);
        $this->actingAs($this->user)->getJson($this->url("/branching/nodes/{$this->start->id}/analysis"))->assertOk()->assertJsonPath('analysis.stale', true);
    }

    public function test_con_groq_valida_la_respuesta_y_registra_la_llamada(): void
    {
        $this->groq();
        $stranger = $this->project->characters()->create(['name' => 'Ajena']);
        Http::fake([self::URL => Http::response($this->completion([
            'scene' => ['v' => 1.7, 'a' => 0.8, 'd' => 0.3, 'emotion' => 'fear', 'summary' => 'Miedo contenido.', 'evidence' => 'Tengo miedo', 'change_justified' => true, 'change_explanation' => ''],
            'characters' => [
                ['character_id' => $this->irene->id, 'name' => 'Irene', 'v' => 0.2, 'a' => 0.7, 'd' => 0.3, 'emotion' => 'fear', 'evidence' => 'Tengo miedo', 'out_of_character' => false, 'out_of_character_reason' => '', 'change_justified' => true, 'change_explanation' => ''],
                ['character_id' => $stranger->id, 'name' => 'Ajena', 'v' => 0.5, 'a' => 0.5, 'd' => 0.5, 'emotion' => 'calm', 'evidence' => '', 'out_of_character' => false, 'out_of_character_reason' => '', 'change_justified' => true, 'change_explanation' => ''],
            ],
            'inconsistencies' => [['fragment' => 'bajar', 'contradicts' => 'Nadie baja de noche', 'explanation' => 'La regla es inquebrantable.', 'severity' => 'high']],
            'suggestions' => [['kind' => 'conflict', 'text' => 'Deja que Irene dude más.', 'why' => 'Refuerza su miedo.']],
        ]))]);

        $response = $this->actingAs($this->user)->postJson($this->url("/branching/nodes/{$this->start->id}/analyze"))->assertOk();

        $response->assertJsonPath('analysis.source', 'groq')
            ->assertJsonPath('analysis.emotion', 'fear')
            ->assertJsonPath('analysis.vad.v', 1)
            ->assertJsonPath('analysis.speaker.name', 'Irene')
            ->assertJsonPath('analysis.inconsistencies.0.url', "/projects/{$this->project->id}/bible/rules?entry={$this->rule->id}");
        // El personaje ajeno a la escena (no es el hablante) se descarta.
        $this->assertCount(1, EmotionalAnalysis::sole()->result['characters']);

        $generation = AiGeneration::sole();
        $this->assertSame('node_analysis', $generation->generation_type);
        $this->assertSame('ok', $generation->status);
        $this->assertStringNotContainsString('test-secret-key', json_encode($generation->toArray()));

        Http::assertSent(function (Request $request) {
            $user = $request['messages'][1]['content'];

            // El contexto lleva el hablante, la regla vinculada, el texto y las opciones de salida.
            return str_contains($user, 'Irene') && str_contains($user, 'Nadie baja de noche') && str_contains($user, 'Tomás duda') && str_contains($user, 'Bajar de noche → Fin');
        });
    }

    public function test_si_groq_falla_se_degrada_a_palabras_clave(): void
    {
        $this->groq();
        Http::fake([self::URL => Http::response(['error' => ['message' => 'down']], 503)]);

        $this->actingAs($this->user)->postJson($this->url("/branching/nodes/{$this->start->id}/analyze"))
            ->assertOk()->assertJsonPath('analysis.degraded', true)->assertJsonPath('analysis.source', 'keywords');

        $this->assertSame('degraded', AiGeneration::sole()->status);
    }

    public function test_el_analisis_de_nodo_exige_texto_y_acceso(): void
    {
        $empty = DialogueNode::create(['project_id' => $this->project->id, 'node_key' => 'vacio', 'dialogue_type' => 'ambient', 'text' => '  ']);

        $this->actingAs($this->user)->postJson($this->url("/branching/nodes/{$empty->id}/analyze"))->assertUnprocessable();
        $this->actingAs(User::factory()->create())->postJson($this->url("/branching/nodes/{$this->start->id}/analyze"))->assertForbidden();

        $other = $this->user->projects()->create(['title' => 'Otro']);
        $this->actingAs($this->user)->postJson("/projects/{$other->id}/branching/nodes/{$this->start->id}/analyze")->assertNotFound();
    }

    // ── HU 50: revisar consecuencias ──

    public function test_revisar_consecuencias_valida_los_hallazgos_y_no_modifica_el_grafo(): void
    {
        $this->groq();
        Http::fake([self::URL => Http::response($this->completion([
            'summary' => 'Hay una decisión que choca con una regla.',
            'findings' => [
                ['kind' => 'incompatibility', 'option_id' => $this->confess->id, 'explanation' => 'Bajar de noche rompe una regla inquebrantable.', 'evidence' => 'Bajar de noche', 'severity' => 'high'],
                ['kind' => 'convergence', 'option_id' => $this->help->id, 'explanation' => 'Ayudar vuelve al mismo nodo.', 'evidence' => 'Ayudarle', 'severity' => 'low'],
                ['kind' => 'incompatibility', 'option_id' => 999999, 'explanation' => 'Inventada.', 'evidence' => '', 'severity' => 'high'],
                ['kind' => 'magic', 'option_id' => $this->help->id, 'explanation' => 'Tipo desconocido.', 'evidence' => '', 'severity' => 'extreme'],
            ],
        ]))]);
        $before = $this->snapshot();

        $response = $this->actingAs($this->user)->postJson($this->url('/ai/consequence-review'))->assertOk();

        $response->assertJsonCount(3, 'findings')
            ->assertJsonPath('findings.0.option_id', $this->confess->id)
            ->assertJsonPath('findings.0.node_id', $this->start->id)
            ->assertJsonPath('findings.0.node_title', 'Inicio')
            ->assertJsonPath('findings.0.review', false)
            ->assertJsonPath('findings.1.kind', 'convergence')
            ->assertJsonPath('findings.1.review', true)
            ->assertJsonPath('findings.2.kind', 'incompatibility')
            ->assertJsonPath('findings.2.severity', 'medium');
        $this->assertSame($before, $this->snapshot());

        $generation = AiGeneration::sole();
        $this->assertSame('consequence_review', $generation->generation_type);
        $response->assertJsonPath('generation_id', $generation->id);

        Http::assertSent(function (Request $request) {
            $user = $request['messages'][1]['content'];

            return $request['response_format']['json_schema']['strict'] === true
                && str_contains($user, "[option:{$this->confess->id}]")
                && str_contains($user, 'requiere confianza >= 1')
                && str_contains($user, 'efectos: confianza add 1')
                && str_contains($user, 'Nadie baja de noche')
                && str_contains($user, '(INICIO)')
                && str_contains($user, '(FINAL)');
        });
    }

    public function test_revisar_consecuencias_sin_opciones_no_llama_a_la_ia(): void
    {
        $this->groq();
        Http::fake();
        DialogueOption::query()->delete();

        $this->actingAs($this->user)->postJson($this->url('/ai/consequence-review'))->assertUnprocessable();
        Http::assertNothingSent();
        $this->assertSame(0, AiGeneration::count());
    }

    public function test_si_la_ia_no_responde_la_revision_devuelve_un_aviso_amable(): void
    {
        $this->actingAs($this->user)->postJson($this->url('/ai/consequence-review'))
            ->assertStatus(503)->assertJsonPath('message', __('The AI connection is not configured.'));

        $this->groq();
        Http::fake([self::URL => Http::response(['error' => ['message' => 'rate']], 429)]);
        $this->actingAs($this->user)->postJson($this->url('/ai/consequence-review'))
            ->assertStatus(503)->assertJsonPath('message', __('AI is busy, try again in a minute'));
        $this->assertSame('error', AiGeneration::sole()->status);

        $this->actingAs(User::factory()->create())->postJson($this->url('/ai/consequence-review'))->assertForbidden();
    }

    // ── HU 56: disonancias ludonarrativas ──

    public function test_detecta_disonancias_con_evidencia_y_marca_las_mecanicas_sin_contexto(): void
    {
        $this->groq();
        $refuge = $this->project->loreEntries()->create(['title' => 'Refugio', 'type' => 'location']);
        $refuge->linkedEntries()->attach($this->rule);
        $script = app(ScriptService::class);
        $scene = $script->createScene($this->project, 'La tormenta', 'Acto I', $this->user->id);
        $scene = $script->save($scene, [['id' => 'b1', 'kind' => 'action', 'text' => 'La nieve tapa la puerta.']], [$this->irene->id], $refuge->id, $this->user->id);

        $descend = $this->project->mechanics()->create(['title' => 'Descenso nocturno', 'kind' => 'exploration', 'description' => 'El jugador baja la montaña de noche sin coste.']);
        $descend->scenes()->attach($scene);
        $descend->characters()->attach($this->irene);
        $alone = $this->project->mechanics()->create(['title' => 'Cocinar', 'kind' => 'resource']);

        Http::fake([self::URL => Http::response($this->completion([
            'summary' => 'Una mecánica contradice una regla del mundo.',
            'findings' => [
                ['mechanic_id' => $descend->id, 'element_type' => 'rule', 'element_id' => $this->rule->id, 'conflict' => 'Permite bajar de noche sin coste.', 'evidence' => 'sin coste', 'severity' => 'high'],
                ['mechanic_id' => $descend->id, 'element_type' => 'character', 'element_id' => 999999, 'conflict' => 'Elemento inventado.', 'evidence' => '', 'severity' => 'low'],
                ['mechanic_id' => $alone->id, 'element_type' => 'scene', 'element_id' => $scene->id, 'conflict' => 'No se envió.', 'evidence' => '', 'severity' => 'low'],
            ],
        ]))]);

        $response = $this->actingAs($this->user)->postJson($this->url('/ai/ludonarrative-review'))->assertOk();

        $response->assertJsonCount(2, 'findings')
            ->assertJsonPath('findings.0.mechanic_title', 'Descenso nocturno')
            ->assertJsonPath('findings.0.element.type', 'rule')
            ->assertJsonPath('findings.0.element.label', 'Nadie baja de noche')
            ->assertJsonPath('findings.0.element.url', "/projects/{$this->project->id}/bible/rules?entry={$this->rule->id}")
            // Un elemento que no está en el contexto de la mecánica se descarta, el hallazgo no.
            ->assertJsonPath('findings.1.element', null)
            ->assertJsonPath('insufficient.0.title', 'Cocinar')
            ->assertJsonPath('reviewed', [$descend->id]);
        $this->assertSame('ludonarrative_review', AiGeneration::sole()->generation_type);

        Http::assertSent(function (Request $request) use ($descend, $scene) {
            $user = $request['messages'][1]['content'];

            return str_contains($user, "[mechanic:{$descend->id}]")
                && str_contains($user, "[scene:{$scene->id}]")
                && str_contains($user, "[character:{$this->irene->id}]")
                && str_contains($user, "[rule:{$this->rule->id}]")
                && ! str_contains($user, 'Cocinar');
        });
    }

    public function test_sin_vinculos_el_resultado_es_contexto_insuficiente_sin_llamar_a_la_ia(): void
    {
        $this->groq();
        Http::fake();
        $this->project->mechanics()->create(['title' => 'Cocinar', 'kind' => 'resource']);

        $this->actingAs($this->user)->postJson($this->url('/ai/ludonarrative-review'))
            ->assertOk()
            ->assertJsonPath('findings', [])
            ->assertJsonPath('insufficient.0.title', 'Cocinar')
            ->assertJsonPath('generation_id', null)
            ->assertJsonPath('summary', __('Insufficient context: link scenes or characters to your mechanics to compare them with the story.'));

        Http::assertNothingSent();
    }

    // ── HU 52: "Usar como base" ──

    public function test_una_sugerencia_larga_se_puede_usar_como_instruccion_de_refinar(): void
    {
        $this->groq();
        $script = app(ScriptService::class);
        $scene = $script->save($script->createScene($this->project, 'E1', 'Acto I', $this->user->id), [['id' => 'b1', 'kind' => 'action', 'text' => 'Nieve.']], [], null, $this->user->id);
        Http::fake([self::URL => Http::response($this->completion(['proposal' => 'Nieve que pesa.', 'changes' => [], 'resulting_emotion' => 'sadness']))]);
        $suggestion = str_repeat('Haz que la nieve pese sobre el grupo. ', 15);

        $this->actingAs($this->user)->postJson($this->url("/script/scenes/{$scene->id}/refine"), [
            'block' => ['id' => 'b1', 'kind' => 'action', 'text' => 'Nieve.'],
            'goal' => 'clearer',
            'instruction' => trim($suggestion),
        ])->assertOk()->assertJsonPath('proposal', 'Nieve que pesa.');

        // La propuesta no se guarda: el guion sigue igual hasta Aplicar + Guardar.
        $this->assertSame('Nieve.', $scene->fresh()->script[0]['text']);
        Http::assertSent(fn (Request $request) => str_contains($request['messages'][0]['content'].$request['messages'][1]['content'], 'Haz que la nieve pese'));
    }

    private function completion(array $content): array
    {
        return [
            'choices' => [['message' => ['role' => 'assistant', 'content' => json_encode($content)], 'finish_reason' => 'stop']],
            'usage' => ['prompt_tokens' => 500, 'completion_tokens' => 200, 'total_tokens' => 700],
        ];
    }
}
