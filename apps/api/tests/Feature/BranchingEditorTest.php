<?php

namespace Tests\Feature;

use App\Models\Character;
use App\Models\DialogueNode;
use App\Models\DialogueOption;
use App\Models\EmotionalAnalysis;
use App\Models\Project;
use App\Models\Scene;
use App\Models\User;
use App\Services\Branching\ReferenceSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BranchingEditorTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->project = $this->makeProject($this->user);
    }

    private function makeProject(User $user, string $title = 'Dustfall Protocol'): Project
    {
        return $user->projects()->create([
            'title' => $title,
            'game_genre' => 'RPG',
            'language' => 'Espanol',
            'narrative_type' => 'balanced',
        ]);
    }

    private function node(string $title, string $text = '', ?Project $project = null, array $extra = []): DialogueNode
    {
        $project ??= $this->project;

        return DialogueNode::create([
            'project_id' => $project->id,
            'node_key' => strtolower(str_replace(' ', '_', $title)),
            'title' => $title,
            'dialogue_type' => 'ambient',
            'text' => $text,
            ...$extra,
        ]);
    }

    private function url(string $path = '', ?Project $project = null): string
    {
        return '/projects/'.($project ?? $this->project)->id.'/branching'.$path;
    }

    private function save(DialogueNode $node, array $data, ?User $as = null)
    {
        return $this->actingAs($as ?? $this->user)->putJson($this->url("/nodes/{$node->id}"), $data);
    }

    private function optionsOf(DialogueNode $node)
    {
        return DialogueOption::where('dialogue_node_id', $node->id)->orderBy('id')->get();
    }

    public function test_reference_creates_target_and_option(): void
    {
        $inicio = $this->node('Inicio');

        $this->save($inicio, ['text' => 'Ve al {{Bosque}}.'])->assertOk()->assertJsonPath('sync.created_options', 1);

        $bosque = DialogueNode::where('project_id', $this->project->id)->where('title', 'Bosque')->firstOrFail();
        $option = $this->optionsOf($inicio)->sole();

        $this->assertSame($bosque->id, $option->next_dialogue_node_id);
        $this->assertSame('Bosque', $option->player_option);
        $this->assertSame('bosque', $option->source_ref);
        $this->assertSame('bosque', $bosque->node_key);
    }

    public function test_two_references_create_two_targets_and_options(): void
    {
        $inicio = $this->node('Inicio');

        $this->save($inicio, ['text' => '{{Bosque}} o {{Castillo}}'])->assertOk();

        $this->assertSame(3, DialogueNode::where('project_id', $this->project->id)->count());
        $this->assertSame(['Bosque', 'Castillo'], $this->optionsOf($inicio)->pluck('player_option')->all());
    }

    public function test_reference_reuses_existing_target_from_another_node(): void
    {
        $inicio = $this->node('Inicio', '');
        $otro = $this->node('Otro');

        $this->save($inicio, ['text' => '{{Bosque}}'])->assertOk();
        $this->save($otro, ['text' => '{{ bosque }}'])->assertOk();

        $this->assertSame(1, DialogueNode::where('title', 'Bosque')->count());
        $this->assertSame(
            $this->optionsOf($inicio)->sole()->next_dialogue_node_id,
            $this->optionsOf($otro)->sole()->next_dialogue_node_id,
        );
    }

    public function test_removing_reference_deletes_only_managed_option(): void
    {
        $inicio = $this->node('Inicio');
        $manual = $inicio->options()->create(['player_option' => 'Manual', 'consequence' => 'Pierde algo']);

        $this->save($inicio, ['text' => '{{Bosque}} {{Castillo}}'])->assertOk();
        $this->save($inicio, ['text' => '{{Bosque}}'])->assertOk()->assertJsonCount(1, 'sync.removed_options');

        $this->assertSame(['Manual', 'Bosque'], $this->optionsOf($inicio)->pluck('player_option')->all());
        $this->assertSame('Pierde algo', $manual->fresh()->consequence);
        $this->assertDatabaseHas('dialogue_nodes', ['title' => 'Castillo']);
    }

    public function test_rename_keeps_key_and_id_and_updates_references(): void
    {
        $inicio = $this->node('Inicio', '');
        $this->save($inicio, ['text' => 'Ir al {{Bosque}}'])->assertOk();
        $bosque = DialogueNode::where('title', 'Bosque')->firstOrFail();
        $option = $this->optionsOf($inicio)->sole();
        $option->update(['consequence' => 'Se pierde el mapa', 'required_condition' => 'tiene_llave']);

        $response = $this->save($bosque, ['title' => 'Selva Oscura'])->assertOk();

        $response->assertJsonPath('renamed.0.id', $inicio->id);
        $bosque->refresh();
        $this->assertSame('bosque', $bosque->node_key);
        $this->assertSame('Selva Oscura', $bosque->title);
        $this->assertSame('Ir al {{Selva Oscura}}', $inicio->fresh()->text);

        $option = $this->optionsOf($inicio)->sole();
        $this->assertSame($bosque->id, $option->next_dialogue_node_id);
        $this->assertSame('selva oscura', $option->source_ref);
        $this->assertSame('Selva Oscura', $option->player_option);
        $this->assertSame('Se pierde el mapa', $option->consequence);
        $this->assertSame('tiene_llave', $option->required_condition);
    }

    public function test_duplicate_title_is_rejected_with_422(): void
    {
        $inicio = $this->node('Inicio');
        $this->node('Bosque');

        $this->save($inicio, ['title' => '  bosque '])->assertStatus(422)->assertJsonValidationErrors('title');
        $this->assertSame('Inicio', $inicio->fresh()->title);
    }

    public function test_untitled_legacy_node_falls_back_to_node_key_and_resolves_references(): void
    {
        $legacy = DialogueNode::create([
            'project_id' => $this->project->id,
            'node_key' => 'archive_intro_001',
            'dialogue_type' => 'interactive_alternative_paths',
            'text' => 'Bienvenido',
        ]);
        $inicio = $this->node('Inicio');

        $this->save($inicio, ['text' => '{{archive_intro_001}}'])->assertOk();

        $this->assertSame($legacy->id, $this->optionsOf($inicio)->sole()->next_dialogue_node_id);
        $graph = $this->actingAs($this->user)->getJson($this->url('/graph'))->assertOk();
        $this->assertContains('archive_intro_001', array_column($graph->json('nodes'), 'display_title'));
    }

    public function test_saving_positions_persists_them(): void
    {
        $a = $this->node('A');
        $b = $this->node('B');

        $this->actingAs($this->user)->putJson($this->url('/positions'), [
            'positions' => [['id' => $a->id, 'x' => 120.5, 'y' => -40]],
        ])->assertOk()->assertJsonPath('updated', 1);

        $this->assertEquals(120.5, $a->fresh()->pos_x);
        $this->assertEquals(-40, $a->fresh()->pos_y);
        $this->assertNull($b->fresh()->pos_x);
    }

    public function test_option_with_consequence_and_target_persists(): void
    {
        $a = $this->node('A');
        $b = $this->node('B');

        $this->actingAs($this->user)->postJson($this->url("/nodes/{$a->id}/options"), [
            'player_option' => 'Atacar',
            'next_dialogue_node_id' => $b->id,
            'consequence' => 'Pierde reputacion',
            'required_condition' => 'tiene_espada',
        ])->assertCreated();

        $this->assertDatabaseHas('dialogue_options', [
            'dialogue_node_id' => $a->id,
            'next_dialogue_node_id' => $b->id,
            'consequence' => 'Pierde reputacion',
            'required_condition' => 'tiene_espada',
            'source_ref' => null,
        ]);
    }

    public function test_managed_option_target_cannot_be_changed_but_consequence_can(): void
    {
        $a = $this->node('A');
        $other = $this->node('Other');
        $this->save($a, ['text' => '{{B}}'])->assertOk();
        $option = $this->optionsOf($a)->sole();

        $url = $this->url("/options/{$option->id}");
        $this->actingAs($this->user)->putJson($url, ['next_dialogue_node_id' => $other->id])->assertStatus(422);
        $this->actingAs($this->user)->deleteJson($url)->assertStatus(422);
        $this->actingAs($this->user)->putJson($url, ['consequence' => 'X'])->assertOk();

        $this->assertSame('X', $option->fresh()->consequence);
    }

    public function test_graph_returns_nodes_texts_edges_and_positions(): void
    {
        $a = $this->node('A', '', null, ['pos_x' => 10, 'pos_y' => 20]);
        $this->save($a, ['text' => 'Hacia {{B}}'])->assertOk();

        $graph = $this->actingAs($this->user)->getJson($this->url('/graph'))->assertOk();

        $graph->assertJsonCount(2, 'nodes')->assertJsonCount(1, 'edges');
        $graph->assertJsonPath('nodes.0.text', 'Hacia {{B}}')->assertJsonPath('nodes.0.pos_x', 10)->assertJsonPath('nodes.0.pos_y', 20);
        $graph->assertJsonPath('edges.0.label', 'B')->assertJsonPath('edges.0.source', $a->id)->assertJsonPath('start_node_id', $a->id);
        $this->assertNotNull($graph->json('nodes.1.pos_x'), 'El nodo creado nace junto a su origen.');
    }

    public function test_other_user_gets_403_and_foreign_nodes_are_not_touched(): void
    {
        $intruder = User::factory()->create();
        $a = $this->node('A', 'texto');

        $this->actingAs($intruder)->getJson($this->url('/graph'))->assertForbidden();
        $this->save($a, ['text' => 'hack'], $intruder)->assertForbidden();
        $this->actingAs($intruder)->deleteJson($this->url("/nodes/{$a->id}"))->assertForbidden();
        $this->actingAs($intruder)->putJson($this->url('/positions'), ['positions' => [['id' => $a->id, 'x' => 1, 'y' => 1]]])->assertForbidden();

        $this->assertSame('texto', $a->fresh()->text);
    }

    public function test_nodes_and_references_never_cross_projects(): void
    {
        $otherProject = $this->makeProject($this->user, 'Otro');
        $foreign = $this->node('Bosque', 'intacto', $otherProject);
        $a = $this->node('A');

        $this->save($a, ['text' => '{{Bosque}}'])->assertOk();

        $this->assertNotSame($foreign->id, $this->optionsOf($a)->sole()->next_dialogue_node_id);
        $this->assertSame('intacto', $foreign->fresh()->text);
        $this->assertSame(1, DialogueNode::where('project_id', $otherProject->id)->count());

        $this->save($foreign, ['text' => 'x'])->assertNotFound();
        $this->actingAs($this->user)->postJson($this->url("/nodes/{$a->id}/options"), [
            'player_option' => 'Salto',
            'next_dialogue_node_id' => $foreign->id,
        ])->assertStatus(422)->assertJsonValidationErrors('next_dialogue_node_id');
        $this->save($a, ['scene_id' => Scene::create(['project_id' => $otherProject->id, 'title' => 'Ajena'])->id])
            ->assertStatus(422)->assertJsonValidationErrors('scene_id');
        $this->actingAs($this->user)->putJson($this->url('/positions'), ['positions' => [['id' => $foreign->id, 'x' => 1, 'y' => 1]]])
            ->assertStatus(422);
    }

    public function test_scene_and_character_are_preserved_and_context_is_available(): void
    {
        $scene = Scene::create(['project_id' => $this->project->id, 'title' => 'Archivo', 'conflict' => 'Memoria rota']);
        $character = Character::create(['project_id' => $this->project->id, 'name' => 'Ira', 'motivation' => 'Recordar']);
        $this->project->loreEntries()->create(['title' => 'La Caida', 'type' => 'event']);
        $a = $this->node('A');

        $this->save($a, [
            'scene_id' => $scene->id, 'character_id' => $character->id, 'text' => '{{B}}',
            'emotional_tone' => 'tenso', 'trigger_condition' => 'flag_x',
        ])->assertOk();
        $this->save($a, ['title' => 'A prima'])->assertOk();

        $a->refresh();
        $this->assertSame($scene->id, $a->scene_id);
        $this->assertSame($character->id, $a->character_id);
        $this->assertSame($scene->id, DialogueNode::where('title', 'B')->firstOrFail()->scene_id);

        $context = $this->actingAs($this->user)->getJson($this->url("/nodes/{$a->id}/context"))->assertOk();
        $context->assertJsonPath('context.scene.title', 'Archivo')
            ->assertJsonPath('context.scene.conflict', 'Memoria rota')
            ->assertJsonPath('context.character.name', 'Ira')
            ->assertJsonPath('context.options.0.target', 'B')
            ->assertJsonPath('context.lore.0.title', 'La Caida');
    }

    public function test_analysis_does_not_change_content(): void
    {
        $a = $this->node('A', 'El miedo y la traicion {{B}}');
        $this->save($a, ['text' => 'El miedo y la traicion {{B}}'])->assertOk();
        $before = [$a->fresh()->only(['title', 'text', 'node_key']), $this->optionsOf($a)->toArray(), DialogueNode::count()];

        $this->actingAs($this->user)->postJson($this->url("/nodes/{$a->id}/analysis"))
            ->assertOk()->assertJsonPath('analysis.analyzable_id', $a->id)->assertJsonStructure(['analysis' => ['suggestions'], 'context']);

        $this->assertSame(1, EmotionalAnalysis::where('analyzable_id', $a->id)->count());
        $after = [$a->fresh()->only(['title', 'text', 'node_key']), $this->optionsOf($a)->toArray(), DialogueNode::count()];
        $this->assertSame($before, $after);
    }

    public function test_sync_is_idempotent_and_ignores_unclosed_references(): void
    {
        $a = $this->node('A');
        $service = app(ReferenceSyncService::class);
        $this->save($a, ['text' => '{{Bosque}} {{  Bosque }} {{Castillo}} {{Busc'])->assertOk();

        $snapshot = fn () => [DialogueNode::orderBy('id')->get()->toArray(), DialogueOption::orderBy('id')->get()->toArray()];
        $first = $snapshot();

        foreach (range(1, 3) as $ignored) {
            $service->sync($a->fresh());
            $this->save($a, ['text' => '{{Bosque}} {{  Bosque }} {{Castillo}} {{Busc'])->assertOk();
        }

        $this->assertSame($first, $snapshot());
        $this->assertSame(3, DialogueNode::count());
        $this->assertSame(2, DialogueOption::count());
        $this->assertDatabaseMissing('dialogue_nodes', ['title' => 'Busc']);
    }

    public function test_delete_node_keeps_incoming_options_as_broken_and_reports_them(): void
    {
        $a = $this->node('A');
        $this->save($a, ['text' => 'Ir a {{B}}'])->assertOk();
        $manual = $a->options()->create(['player_option' => 'Manual', 'next_dialogue_node_id' => DialogueNode::where('title', 'B')->value('id')]);
        $b = DialogueNode::where('title', 'B')->firstOrFail();

        $response = $this->actingAs($this->user)->deleteJson($this->url("/nodes/{$b->id}"))->assertOk();

        $response->assertJsonCount(2, 'broken_options');
        $this->assertDatabaseMissing('dialogue_nodes', ['id' => $b->id]);
        $this->assertSame('Ir a {{B}}', $a->fresh()->text);
        $this->assertSame(2, $this->optionsOf($a)->count());
        $this->assertNull($manual->fresh()->next_dialogue_node_id);
        $this->assertContains('broken_option', array_column($response->json('graph.warnings'), 'code'));
    }

    public function test_graph_flags_isolated_nodes(): void
    {
        $this->node('A');
        $this->node('B');

        $codes = $this->actingAs($this->user)->getJson($this->url('/graph'))->json('warnings.*.code');

        $this->assertSame(['isolated', 'isolated'], $codes);
    }

    public function test_editor_page_renders_for_owner(): void
    {
        $this->node('A');
        config(['inertia.testing.ensure_pages_exist' => false]);

        $this->actingAs($this->user)->get($this->url())->assertOk()->assertInertia(
            fn ($page) => $page->component('Branching/Index')->has('graph.nodes', 1)
        );
    }

    public function test_legacy_option_form_keeps_managed_marker(): void
    {
        $a = $this->node('A');
        $this->save($a, ['text' => '{{B}}'])->assertOk();
        $option = $this->optionsOf($a)->sole();

        $this->actingAs($this->user)->put("/projects/{$this->project->id}/dialogues/{$a->id}", [
            'node_key' => 'a',
            'dialogue_type' => 'ambient',
            'text' => '{{B}}',
            'options' => [['player_option' => 'B', 'next_dialogue_node_id' => $option->next_dialogue_node_id, 'consequence' => 'c']],
        ])->assertSessionHasNoErrors();

        $this->assertSame('b', $this->optionsOf($a)->sole()->source_ref);
        $this->save($a, ['text' => '{{B}}'])->assertOk();
        $this->assertSame(1, $this->optionsOf($a)->count());
    }
}
