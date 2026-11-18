<?php

namespace Tests\Feature;

use App\Models\BranchingVariable;
use App\Models\DialogueNode;
use App\Models\DialogueOption;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Ramificación con estado: inicio y finales (HU 18), flujo alcanzable (HU 21), vínculos con la
 * Biblia (HU 20), variables, condiciones y efectos (HU 19) y "Probar recorrido" (HU 22).
 */
class BranchingFlowTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->project = $this->user->projects()->create(['title' => 'Cumbre', 'language' => 'es', 'narrative_type' => 'branching']);
    }

    private function node(string $title, array $extra = []): DialogueNode
    {
        return DialogueNode::create([
            'project_id' => $this->project->id,
            'node_key' => strtolower(str_replace(' ', '_', $title)),
            'title' => $title,
            'dialogue_type' => 'ambient',
            'text' => '',
            ...$extra,
        ]);
    }

    private function link(DialogueNode $from, DialogueNode $to, string $label = 'Seguir', array $extra = []): DialogueOption
    {
        return DialogueOption::create(['dialogue_node_id' => $from->id, 'next_dialogue_node_id' => $to->id, 'player_option' => $label, ...$extra]);
    }

    private function url(string $path = ''): string
    {
        return "/projects/{$this->project->id}/branching{$path}";
    }

    /** @return array<int, string> códigos de aviso por id de nodo */
    private function warnings(): array
    {
        $graph = $this->actingAs($this->user)->getJson($this->url('/graph'))->assertOk()->json();

        return collect($graph['warnings'])->mapWithKeys(fn (array $warning) => [$warning['node_id'] => $warning['code']])->all();
    }

    private function variable(string $key = 'confianza', string $type = 'number', mixed $initial = 0): BranchingVariable
    {
        return $this->project->branchingVariables()->create(['key' => $key, 'type' => $type, 'initial_value' => $initial]);
    }

    // ── Inicio y finales ──

    public function test_marcar_un_inicio_desmarca_el_anterior_y_el_grafo_lo_respeta(): void
    {
        $a = $this->node('A');
        $b = $this->node('B');
        $c = $this->node('C');

        $this->actingAs($this->user)->putJson($this->url("/nodes/{$b->id}"), ['is_start' => true])->assertOk()->assertJsonPath('graph.start_node_id', $b->id);
        $this->actingAs($this->user)->putJson($this->url("/nodes/{$c->id}"), ['is_start' => true])->assertOk()->assertJsonPath('graph.start_node_id', $c->id);

        $this->assertSame([$c->id], DialogueNode::where('is_start', true)->pluck('id')->all());

        // Sin inicio marcado se usa el de menor id.
        $this->actingAs($this->user)->putJson($this->url("/nodes/{$c->id}"), ['is_start' => false])->assertOk()->assertJsonPath('graph.start_node_id', $a->id);
    }

    public function test_un_final_declarado_no_avisa_de_que_no_tiene_salidas(): void
    {
        $a = $this->node('A');
        $fin = $this->node('Fin');
        $suelto = $this->node('Suelto');
        $this->link($a, $fin);
        $this->link($a, $suelto);

        $this->assertSame('no_outgoing', $this->warnings()[$fin->id]);

        $this->actingAs($this->user)->putJson($this->url("/nodes/{$fin->id}"), ['is_ending' => true])->assertOk();

        $warnings = $this->warnings();
        $this->assertArrayNotHasKey($fin->id, $warnings);
        $this->assertSame('no_outgoing', $warnings[$suelto->id]);
    }

    // ── Flujo alcanzable ──

    public function test_un_ciclo_aislado_del_inicio_es_inalcanzable_y_uno_alcanzable_no_avisa(): void
    {
        $inicio = $this->node('Inicio', ['is_start' => true]);
        $x = $this->node('X');
        $y = $this->node('Y');
        $this->link($inicio, $x);
        $this->link($x, $y);
        $this->link($y, $x, 'Volver');

        // Ciclo X ⇄ Y aislado del inicio.
        $p = $this->node('P');
        $q = $this->node('Q');
        $this->link($p, $q);
        $this->link($q, $p);

        $warnings = $this->warnings();
        $this->assertSame('unreachable', $warnings[$p->id]);
        $this->assertSame('unreachable', $warnings[$q->id]);
        $this->assertArrayNotHasKey($x->id, $warnings);
        $this->assertArrayNotHasKey($y->id, $warnings);
        $this->assertArrayNotHasKey($inicio->id, $warnings);
    }

    public function test_los_descendientes_de_un_nodo_sin_entrada_son_inalcanzables(): void
    {
        $this->node('Inicio', ['is_start' => true]);
        $huerfano = $this->node('Huérfano');
        $hijo = $this->node('Hijo', ['is_ending' => true]);
        $this->link($huerfano, $hijo);

        $warnings = $this->warnings();
        $this->assertSame('no_incoming', $warnings[$huerfano->id]);
        $this->assertSame('unreachable', $warnings[$hijo->id]);
    }

    // ── Vínculos con la Biblia ──

    public function test_vincula_entradas_de_la_biblia_del_mismo_proyecto(): void
    {
        $node = $this->node('A');
        $lugar = $this->project->loreEntries()->create(['title' => 'Refugio', 'type' => 'location']);
        $ajeno = $this->user->projects()->create(['title' => 'Otro'])->loreEntries()->create(['title' => 'Ajeno', 'type' => 'rule']);

        $this->actingAs($this->user)->putJson($this->url("/nodes/{$node->id}"), ['lore_entry_ids' => [$ajeno->id]])->assertUnprocessable()->assertJsonValidationErrors('lore_entry_ids.0');

        $this->actingAs($this->user)->putJson($this->url("/nodes/{$node->id}"), ['lore_entry_ids' => [$lugar->id]])
            ->assertOk()
            ->assertJsonPath('graph.nodes.0.lore_entry_ids', [$lugar->id])
            ->assertJsonPath('graph.lore_entries.0.title', 'Refugio');

        // Otros cambios del nodo no tocan los vínculos.
        $this->actingAs($this->user)->putJson($this->url("/nodes/{$node->id}"), ['text' => 'Hola'])->assertOk();
        $this->assertSame([$lugar->id], $node->loreEntries()->pluck('lore_entries.id')->all());

        $this->actingAs($this->user)->putJson($this->url("/nodes/{$node->id}"), ['lore_entry_ids' => []])->assertOk();
        $this->assertSame(0, $node->loreEntries()->count());
    }

    // ── Variables, condiciones y efectos ──

    public function test_crea_variables_y_valida_clave_tipo_y_valor_inicial(): void
    {
        $this->actingAs($this->user)->postJson($this->url('/variables'), ['key' => 'confianza', 'type' => 'number', 'initial_value' => 0])
            ->assertCreated()
            ->assertJsonPath('graph.variables.0.key', 'confianza')
            ->assertJsonPath('graph.variables.0.initial_value', 0);

        $this->actingAs($this->user)->postJson($this->url('/variables'), ['key' => 'confianza', 'type' => 'bool', 'initial_value' => false])->assertJsonValidationErrors('key');
        $this->actingAs($this->user)->postJson($this->url('/variables'), ['key' => '1mal', 'type' => 'bool', 'initial_value' => false])->assertJsonValidationErrors('key');
        $this->actingAs($this->user)->postJson($this->url('/variables'), ['key' => 'llave', 'type' => 'bool', 'initial_value' => 3])->assertJsonValidationErrors('initial_value');
        $this->actingAs($this->user)->postJson($this->url('/variables'), ['key' => 'oro', 'type' => 'texto', 'initial_value' => 3])->assertJsonValidationErrors('type');
    }

    public function test_valida_condiciones_y_efectos_segun_el_tipo_de_la_variable(): void
    {
        $this->variable('confianza');
        $this->variable('llave', 'bool', false);
        $a = $this->node('A');
        $option = $this->link($a, $this->node('B'));
        $put = fn (array $data) => $this->actingAs($this->user)->putJson($this->url("/options/{$option->id}"), $data);

        $put(['condition' => ['var' => 'fantasma', 'op' => '==', 'value' => 1]])->assertJsonValidationErrors('condition.var');
        $put(['condition' => ['var' => 'llave', 'op' => '>=', 'value' => true]])->assertJsonValidationErrors('condition.value');
        $put(['condition' => ['var' => 'confianza', 'op' => '>=', 'value' => 'mucho']])->assertJsonValidationErrors('condition.value');
        $put(['condition' => ['var' => 'confianza', 'op' => '~', 'value' => 1]])->assertJsonValidationErrors('condition.op');
        $put(['effects' => [['var' => 'llave', 'op' => 'add', 'value' => true]]])->assertJsonValidationErrors('effects.0.value');
        $put(['effects' => [['var' => 'confianza', 'op' => 'mul', 'value' => 2]]])->assertJsonValidationErrors('effects.0.op');

        $put([
            'condition' => ['var' => 'llave', 'op' => '==', 'value' => true],
            'effects' => [['var' => 'confianza', 'op' => 'add', 'value' => 1], ['var' => 'llave', 'op' => 'set', 'value' => false]],
        ])->assertOk()
            ->assertJsonPath('graph.nodes.0.options.0.condition', ['var' => 'llave', 'op' => '==', 'value' => true])
            ->assertJsonPath('graph.nodes.0.options.0.effects.0.op', 'add');

        // false y 0 son valores válidos.
        $put(['condition' => ['var' => 'llave', 'op' => '!=', 'value' => false]])->assertOk();
        $put(['condition' => ['var' => 'llave', 'op' => '==', 'value' => true], 'effects' => [['var' => 'confianza', 'op' => 'set', 'value' => 0]]])->assertOk();
        $this->assertSame(0, $option->fresh()->effects[0]['value']);

        // Las notas del autor (texto libre) se conservan aparte.
        $put(['required_condition' => 'Tener la llave del refugio'])->assertOk();
        $this->assertSame('llave', $option->fresh()->condition['var']);

        // Vaciar condición y efectos los deja en null.
        $put(['condition' => null, 'effects' => []])->assertOk();
        $this->assertNull($option->fresh()->condition);
        $this->assertNull($option->fresh()->effects);
    }

    public function test_renombrar_una_variable_la_reescribe_en_las_opciones(): void
    {
        $variable = $this->variable('confianza');
        $option = $this->link($this->node('A'), $this->node('B'), 'Ayudar', [
            'condition' => ['var' => 'confianza', 'op' => '>=', 'value' => 1],
            'effects' => [['var' => 'confianza', 'op' => 'add', 'value' => 1]],
        ]);

        $this->actingAs($this->user)->putJson($this->url("/variables/{$variable->id}"), ['key' => 'lealtad', 'type' => 'number', 'initial_value' => 2])
            ->assertOk()
            ->assertJsonPath('rewritten_options', 1);

        $option->refresh();
        $this->assertSame('lealtad', $option->condition['var']);
        $this->assertSame('lealtad', $option->effects[0]['var']);
        $this->assertSame(2, $variable->fresh()->initial_value);
    }

    public function test_no_se_borra_ni_cambia_de_tipo_una_variable_en_uso(): void
    {
        $variable = $this->variable('confianza');
        $this->link($this->node('A'), $this->node('B'), 'Ayudar', ['effects' => [['var' => 'confianza', 'op' => 'add', 'value' => 1]]]);

        $this->actingAs($this->user)->deleteJson($this->url("/variables/{$variable->id}"))->assertJsonValidationErrors('variable');
        $this->actingAs($this->user)->putJson($this->url("/variables/{$variable->id}"), ['type' => 'bool', 'initial_value' => true])->assertJsonValidationErrors('type');
        $this->assertModelExists($variable);

        $libre = $this->variable('libre', 'bool', true);
        $this->actingAs($this->user)->deleteJson($this->url("/variables/{$libre->id}"))->assertOk();
        $this->assertModelMissing($libre);
    }

    public function test_las_variables_de_otro_proyecto_no_se_pueden_tocar_ni_usar(): void
    {
        $otro = $this->user->projects()->create(['title' => 'Otro']);
        $ajena = $otro->branchingVariables()->create(['key' => 'secreto', 'type' => 'number', 'initial_value' => 0]);
        $option = $this->link($this->node('A'), $this->node('B'));

        $this->actingAs($this->user)->putJson($this->url("/variables/{$ajena->id}"), ['key' => 'x'])->assertNotFound();
        $this->actingAs($this->user)->deleteJson($this->url("/variables/{$ajena->id}"))->assertNotFound();
        $this->actingAs($this->user)->putJson($this->url("/options/{$option->id}"), ['condition' => ['var' => 'secreto', 'op' => '==', 'value' => 0]])->assertJsonValidationErrors('condition.var');
        $this->actingAs(User::factory()->create())->postJson($this->url('/variables'), ['key' => 'x', 'type' => 'number', 'initial_value' => 0])->assertForbidden();
    }

    public function test_el_formulario_clasico_conserva_condicion_y_efectos(): void
    {
        $this->variable('confianza');
        $a = $this->node('A');
        $b = $this->node('B');
        $this->link($a, $b, 'Ayudar', [
            'condition' => ['var' => 'confianza', 'op' => '>=', 'value' => 1],
            'effects' => [['var' => 'confianza', 'op' => 'add', 'value' => 1]],
        ]);

        $this->actingAs($this->user)->put("/projects/{$this->project->id}/dialogues/{$a->id}", [
            'node_key' => 'a',
            'dialogue_type' => 'ambient',
            'text' => 'Hola',
            'options' => [['player_option' => 'Ayudar', 'next_dialogue_node_id' => $b->id, 'consequence' => 'nota']],
        ])->assertSessionHasNoErrors();

        $option = $a->options()->sole();
        $this->assertSame('confianza', $option->condition['var']);
        $this->assertSame('add', $option->effects[0]['op']);
        $this->assertSame('nota', $option->consequence);
    }

    // ── Probar recorrido ──

    public function test_probar_recorrido_sirve_el_reproductor_con_estado_y_no_escribe_en_la_bd(): void
    {
        $this->variable('confianza');
        $inicio = $this->node('Inicio', ['is_start' => true]);
        $fin = $this->node('Fin', ['is_ending' => true]);
        $this->link($inicio, $fin, 'Ayudar', ['effects' => [['var' => 'confianza', 'op' => 'add', 'value' => 1]]]);
        $this->link($inicio, $fin, 'Confesar', ['condition' => ['var' => 'confianza', 'op' => '>=', 'value' => 1]]);

        $writes = 0;
        DB::listen(function ($query) use (&$writes) {
            $writes += preg_match('/^\s*(insert|update|delete)/i', $query->sql) && ! str_contains($query->sql, 'sessions') ? 1 : 0;
        });

        $response = $this->actingAs($this->user)->get($this->url("/playtest?node={$fin->id}"))->assertOk();

        $this->assertSame(0, $writes);
        $this->assertStringStartsWith('text/html', $response->headers->get('Content-Type'));
        $this->assertNull($response->headers->get('Content-Disposition'));

        $html = $response->getContent();
        $this->assertStringContainsString('var BranchingState', $html);
        $this->assertStringNotContainsString('<script src', $html);

        preg_match('#<script type="application/json" id="texts-data">(.*?)</script>#s', $html, $meta);
        $meta = json_decode($meta[1], true);
        $this->assertTrue($meta['playtest']);
        $this->assertSame($fin->id, $meta['start']);

        preg_match('#<script type="application/json" id="graph-data">(.*?)</script>#s', $html, $graph);
        $graph = json_decode($graph[1], true);
        $this->assertSame([['var' => 'confianza', 'op' => 'add', 'value' => 1]], $graph['nodes'][0]['options'][0]['effects']);
        $this->assertSame('confianza', $graph['variables'][0]['key']);
    }

    public function test_probar_recorrido_ignora_nodos_de_otros_proyectos_y_exige_acceso(): void
    {
        $this->node('A');
        $ajeno = DialogueNode::create(['project_id' => $this->user->projects()->create(['title' => 'Otro'])->id, 'node_key' => 'x', 'dialogue_type' => 'ambient', 'text' => '']);

        $html = $this->actingAs($this->user)->get($this->url("/playtest?node={$ajeno->id}"))->assertOk()->getContent();
        preg_match('#<script type="application/json" id="texts-data">(.*?)</script>#s', $html, $meta);
        $this->assertNull(json_decode($meta[1], true)['start']);

        $this->actingAs(User::factory()->create())->get($this->url('/playtest'))->assertForbidden();
    }
}
