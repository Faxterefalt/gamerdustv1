<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScriptStudioTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->project = $this->user->projects()->create([
            'title' => 'La ciudad que sueña',
            'game_genre' => 'RPG',
            'language' => 'es',
            'narrative_type' => 'branching',
        ]);
    }

    private function url(string $path = ''): string
    {
        return "/projects/{$this->project->id}/script{$path}";
    }

    private function createScene(string $title = 'La primera luz', string $act = 'Acto 1 - La llegada'): array
    {
        return $this->actingAs($this->user)
            ->postJson($this->url('/scenes'), ['title' => $title, 'act' => $act])
            ->assertCreated()
            ->json('scene');
    }

    public function test_crear_escena_desde_el_guion_la_anade_al_final_con_un_encabezado(): void
    {
        $first = $this->createScene();
        $second = $this->createScene('La ciudad responde', 'Acto 2 - El despertar');

        $this->assertSame(1, $first['order']);
        $this->assertSame(2, $second['order']);
        $this->assertSame('heading', $first['script'][0]['kind']);
        $this->assertSame('EXT. LA PRIMERA LUZ - DÍA', $first['script'][0]['text']);
        $this->assertSame(1, Scene::find($first['id'])->versions()->count());
    }

    public function test_guardar_el_guion_actualiza_bloques_referencias_y_crea_una_version(): void
    {
        $scene = $this->createScene();
        $luna = $this->project->characters()->create(['name' => 'Luna']);
        $azotea = $this->project->loreEntries()->create(['title' => 'La azotea', 'type' => 'location']);

        $saved = $this->actingAs($this->user)->putJson($this->url("/scenes/{$scene['id']}"), [
            'updated_at' => $scene['updated_at'],
            'elements' => [
                ['id' => 'a', 'kind' => 'heading', 'text' => 'EXT. LA PRIMERA LUZ - DÍA'],
                ['id' => 'b', 'kind' => 'character', 'text' => 'LUNA'],
                ['id' => 'c', 'kind' => 'dialogue', 'text' => '¿Quién sueña con nosotros cuando dormimos?'],
                ['id' => 'd', 'kind' => 'action', 'text' => null],
            ],
            'characters' => [$luna->id],
            'location_id' => $azotea->id,
        ])->assertOk()->json('scene');

        $this->assertCount(4, $saved['script']);
        $this->assertSame('', $saved['script'][3]['text']);
        $this->assertSame([$luna->id], $saved['character_ids']);
        $this->assertSame($azotea->id, $saved['location_id']);
        $this->assertSame(2, Scene::find($scene['id'])->versions()->count());

        // El token devuelto permite seguir guardando.
        $this->actingAs($this->user)->putJson($this->url("/scenes/{$scene['id']}"), [
            'updated_at' => $saved['updated_at'],
            'elements' => [],
            'characters' => [],
            'location_id' => null,
        ])->assertOk();
    }

    public function test_un_guardado_con_una_version_desactualizada_devuelve_409(): void
    {
        $scene = $this->createScene();

        $this->actingAs($this->user)->putJson($this->url("/scenes/{$scene['id']}"), [
            'updated_at' => '2000-01-01T00:00:00.000000Z',
            'elements' => [],
            'characters' => [],
            'location_id' => null,
        ])->assertStatus(409)->assertJsonStructure(['message']);
    }

    public function test_no_se_pueden_vincular_referencias_de_otro_proyecto_ni_tipos_invalidos(): void
    {
        $scene = $this->createScene();
        $other = $this->user->projects()->create(['title' => 'Otro', 'game_genre' => 'RPG', 'language' => 'es', 'narrative_type' => 'linear']);
        $stranger = $other->characters()->create(['name' => 'Ajeno']);

        $this->actingAs($this->user)->putJson($this->url("/scenes/{$scene['id']}"), [
            'elements' => [['id' => 'a', 'kind' => 'poem', 'text' => 'x']],
            'characters' => [$stranger->id],
            'location_id' => null,
        ])->assertUnprocessable()->assertJsonValidationErrors(['elements.0.kind', 'characters.0']);
    }

    public function test_restaurar_una_version_recupera_su_contenido(): void
    {
        $scene = $this->createScene();
        $original = $scene['script'];

        $this->actingAs($this->user)->putJson($this->url("/scenes/{$scene['id']}"), [
            'elements' => [['id' => 'x', 'kind' => 'action', 'text' => 'Borrador nuevo']],
            'characters' => [],
            'location_id' => null,
        ])->assertOk();

        $versions = $this->actingAs($this->user)->getJson($this->url("/scenes/{$scene['id']}/versions"))->assertOk()->json('versions');
        $this->assertCount(2, $versions);
        $this->assertSame('Borrador nuevo', $versions[0]['script'][0]['text']);

        $restored = $this->actingAs($this->user)
            ->postJson($this->url("/scenes/{$scene['id']}/versions/{$versions[1]['id']}/restore"))
            ->assertOk()->json('scene');

        $this->assertSame($original, $restored['script']);
        $this->assertSame(3, Scene::find($scene['id'])->versions()->count());
    }

    public function test_otro_usuario_no_accede_al_guion_y_las_escenas_ajenas_dan_404(): void
    {
        $scene = $this->createScene();
        $intruder = User::factory()->create();

        $this->actingAs($intruder)->get($this->url())->assertForbidden();
        $this->actingAs($intruder)->putJson($this->url("/scenes/{$scene['id']}"), ['elements' => [], 'characters' => []])->assertForbidden();

        $other = $this->user->projects()->create(['title' => 'Otro', 'game_genre' => 'RPG', 'language' => 'es', 'narrative_type' => 'linear']);
        $this->actingAs($this->user)
            ->getJson("/projects/{$other->id}/script/scenes/{$scene['id']}/versions")
            ->assertNotFound();
    }

    public function test_paginas_del_estudio_y_exportaciones_responden(): void
    {
        $this->createScene();

        foreach (['', '/script', '/bible', '/mechanics', '/collaboration', '/analysis', '/reports'] as $path) {
            $this->actingAs($this->user)->get("/projects/{$this->project->id}{$path}")->assertOk();
        }

        $this->actingAs($this->user)->get($this->url('/print'))->assertOk()->assertSee('EXT. LA PRIMERA LUZ - DÍA');

        $markdown = $this->actingAs($this->user)->get("/projects/{$this->project->id}/reports/markdown")->assertOk();
        $this->assertStringContainsString('# La ciudad que sueña', $markdown->streamedContent());
        $this->assertStringContainsString('EXT. LA PRIMERA LUZ - DÍA', $markdown->streamedContent());
    }

    public function test_comentarios_por_escena_y_mecanicas(): void
    {
        $scene = $this->createScene();

        $this->actingAs($this->user)
            ->post("/projects/{$this->project->id}/comments", ['text' => 'Gran apertura', 'scene_id' => $scene['id']])
            ->assertRedirect();
        $comment = $this->project->comments()->first();
        $this->assertSame($this->user->id, $comment->user_id);
        $this->assertSame($scene['id'], $comment->scene_id);
        $this->assertSame($this->user->name, $comment->toPayload()['author']);

        $this->actingAs($this->user)->delete("/projects/{$this->project->id}/comments/{$comment->id}")->assertRedirect();
        $this->assertSame(0, $this->project->comments()->count());

        $this->actingAs($this->user)
            ->post("/projects/{$this->project->id}/mechanics", ['title' => 'Elegir bando', 'kind' => 'decision', 'activation' => 'Al hablar con Luna'])
            ->assertSessionHasNoErrors();
        $mechanic = $this->project->mechanics()->first();
        $this->assertSame('Al hablar con Luna', $mechanic->activation);

        $this->actingAs($this->user)
            ->put("/projects/{$this->project->id}/mechanics/{$mechanic->id}", ['title' => 'Elegir bando', 'kind' => 'magic'])
            ->assertSessionHasErrors('kind');
    }
}
