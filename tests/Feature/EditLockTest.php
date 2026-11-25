<?php

namespace Tests\Feature;

use App\Models\EditLock;
use App\Models\Project;
use App\Models\Scene;
use App\Models\User;
use App\Services\Branching\BranchingNodeService;
use App\Services\Script\ScriptService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EditLockTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private User $editor;

    private User $viewer;

    private Project $project;

    private Scene $scene;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.locale' => 'es']);

        $this->owner = User::factory()->create(['name' => 'Dueña']);
        $this->editor = User::factory()->create(['name' => 'Editora']);
        $this->viewer = User::factory()->create(['name' => 'Lector']);
        $this->project = $this->owner->projects()->create(['title' => 'Faro', 'language' => 'es', 'narrative_type' => 'branching']);
        $this->project->members()->create(['user_id' => $this->editor->id, 'role' => 'editor']);
        $this->project->members()->create(['user_id' => $this->viewer->id, 'role' => 'viewer']);

        $script = app(ScriptService::class);
        $this->scene = $script->save($script->createScene($this->project, 'El faro', 'Acto I', $this->owner->id), [['id' => '1', 'kind' => 'action', 'text' => 'Mara sube.']], [], null, $this->owner->id);
    }

    public function test_quien_llega_primero_tiene_el_bloqueo_y_el_otro_ve_quien_edita(): void
    {
        $this->beat($this->owner)->assertOk()->assertJsonPath('holder', null)->assertJsonPath('heartbeat_seconds', 20)->assertJsonPath('lock_seconds', 60);

        $this->beat($this->editor)->assertOk()->assertJsonPath('holder.name', 'Dueña')->assertJsonPath('holder.id', $this->owner->id);

        // El latido de la dueña renueva el suyo; el de la editora no se lo quita.
        $this->travel(50)->seconds();
        $this->beat($this->owner)->assertJsonPath('holder', null);
        $this->travel(50)->seconds();
        $this->beat($this->editor)->assertJsonPath('holder.name', 'Dueña');
        $this->assertSame($this->owner->id, EditLock::sole()->user_id);
    }

    public function test_sin_latido_el_bloqueo_caduca_y_lo_toma_el_siguiente(): void
    {
        $this->beat($this->owner);
        $this->travel(61)->seconds();

        $this->beat($this->editor)->assertJsonPath('holder', null);
        $this->beat($this->owner)->assertJsonPath('holder.name', 'Editora');
        $this->assertSame($this->editor->id, EditLock::sole()->user_id);
    }

    public function test_soltar_el_bloqueo_lo_deja_libre_y_solo_suelta_el_propio(): void
    {
        $this->beat($this->owner);

        // Soltar el de otra persona no hace nada.
        $this->actingAs($this->editor)->postJson($this->url('locks/release'), ['type' => 'scene', 'id' => $this->scene->id])->assertNoContent();
        $this->assertSame(1, EditLock::count());

        $this->actingAs($this->owner)->postJson($this->url('locks/release'), ['type' => 'scene', 'id' => $this->scene->id])->assertNoContent();
        $this->beat($this->editor)->assertJsonPath('holder', null);
    }

    public function test_los_nodos_tambien_se_bloquean(): void
    {
        app(BranchingNodeService::class)->create($this->project, ['title' => 'Inicio', 'text' => 'Hola']);
        $node = $this->project->dialogueNodes()->sole();

        $this->beat($this->owner, 'node', $node->id)->assertJsonPath('holder', null);
        $this->beat($this->editor, 'node', $node->id)->assertJsonPath('holder.name', 'Dueña');
        // El bloqueo del nodo no afecta a la escena (ni al revés, aunque compartan id).
        $this->beat($this->editor, 'scene', $this->scene->id)->assertJsonPath('holder', null);
        $this->assertSame(2, EditLock::count());
    }

    public function test_un_lector_no_bloquea_y_no_se_bloquea_lo_de_otro_proyecto(): void
    {
        $this->beat($this->viewer)->assertForbidden();
        $this->assertSame(0, EditLock::count());

        $other = $this->owner->projects()->create(['title' => 'Otro']);
        $foreign = app(ScriptService::class)->createScene($other, 'Ajena', 'Acto I', $this->owner->id);
        $this->beat($this->owner, 'scene', $foreign->id)->assertNotFound();
        $this->beat($this->owner, 'mechanic', $this->scene->id)->assertUnprocessable()->assertJsonValidationErrors('type');

        $stranger = User::factory()->create();
        $this->beat($stranger)->assertForbidden();
    }

    public function test_al_retirar_a_un_miembro_su_bloqueo_desaparece(): void
    {
        $this->beat($this->editor);
        $member = $this->project->members()->where('user_id', $this->editor->id)->sole();

        $this->actingAs($this->owner)->delete($this->url("members/{$member->id}"))->assertRedirect();

        $this->assertSame(0, EditLock::count());
        $this->beat($this->owner)->assertJsonPath('holder', null);
    }

    public function test_el_409_trae_la_version_del_otro_y_sobrescribir_la_reemplaza(): void
    {
        $opened = $this->scene->updated_at->toJSON();
        $this->travel(2)->seconds();

        // La editora guarda primero.
        $this->save($this->editor, $opened, 'Versión de la editora.')->assertOk();

        // La dueña guarda con su updated_at antiguo: 409 con la versión guardada y quién la guardó.
        $conflict = $this->save($this->owner, $opened, 'Versión de la dueña.')
            ->assertStatus(409)
            ->assertJsonPath('conflict.saved_by', 'Editora')
            ->assertJsonPath('conflict.scene.script.0.text', 'Versión de la editora.')
            ->json('conflict.scene');
        $this->assertSame('Versión de la editora.', $this->scene->fresh()->script[0]['text']);

        // "Sobrescribir": reenviar con el updated_at de la versión del otro.
        $this->save($this->owner, $conflict['updated_at'], 'Versión de la dueña.')->assertOk();
        $this->assertSame('Versión de la dueña.', $this->scene->fresh()->script[0]['text']);
        // La de la editora queda en el historial.
        $this->assertContains('Versión de la editora.', $this->scene->versions()->get()->map(fn ($version) => $version->script[0]['text'] ?? null)->all());
    }

    public function test_dos_guardados_en_el_mismo_segundo_tambien_dan_409(): void
    {
        $this->freezeSecond();
        $opened = app(ScriptService::class)->present($this->scene->fresh());

        // La editora guarda con los tokens de apertura; en el mismo segundo, updated_at no cambia.
        $saved = $this->save($this->editor, $opened['updated_at'], 'Versión de la editora.', $opened['version_id'])->assertOk()->json('scene');
        $this->assertSame($opened['updated_at'], $saved['updated_at']);
        $this->assertNotSame($opened['version_id'], $saved['version_id']);

        // La dueña tenía los tokens antiguos: el id de versión delata el conflicto.
        $this->save($this->owner, $opened['updated_at'], 'Versión de la dueña.', $opened['version_id'])
            ->assertStatus(409)
            ->assertJsonPath('conflict.scene.version_id', $saved['version_id']);
        $this->assertSame('Versión de la editora.', $this->scene->fresh()->script[0]['text']);
    }

    private function beat(User $user, string $type = 'scene', ?int $id = null)
    {
        return $this->actingAs($user)->postJson($this->url('locks'), ['type' => $type, 'id' => $id ?? $this->scene->id]);
    }

    private function save(User $user, string $updatedAt, string $text, ?int $versionId = null)
    {
        return $this->actingAs($user)->putJson($this->url("script/scenes/{$this->scene->id}"), [
            'updated_at' => $updatedAt,
            'version_id' => $versionId,
            'elements' => [['id' => '1', 'kind' => 'action', 'text' => $text]],
            'characters' => [],
            'location_id' => null,
        ]);
    }

    private function url(string $path): string
    {
        return "/projects/{$this->project->id}/{$path}";
    }
}
