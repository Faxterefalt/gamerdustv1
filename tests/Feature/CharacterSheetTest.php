<?php

namespace Tests\Feature;

use App\Models\Character;
use App\Models\DialogueNode;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CharacterSheetTest extends TestCase
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
        return "/projects/{$this->project->id}/characters{$path}";
    }

    public function test_la_ficha_lista_los_nodos_de_dialogo_donde_participa(): void
    {
        $lia = $this->project->characters()->create(['name' => 'Lía']);
        $otro = $this->project->characters()->create(['name' => 'Otro']);
        $base = ['project_id' => $this->project->id, 'dialogue_type' => 'ambient', 'text' => ''];
        $saludo = DialogueNode::create([...$base, 'node_key' => 'saludo', 'title' => 'Saludo', 'character_id' => $lia->id]);
        $despedida = DialogueNode::create([...$base, 'node_key' => 'despedida', 'character_id' => $lia->id]);
        DialogueNode::create([...$base, 'node_key' => 'ajeno', 'title' => 'Ajeno', 'character_id' => $otro->id]);

        $this->actingAs($this->user)->get($this->url())->assertOk()->assertInertia(fn ($page) => $page
            ->component('Characters/Index', false)
            ->where('entries.0.name', 'Lía')
            ->where('entries.0.dialogue_nodes', [
                ['id' => $saludo->id, 'title' => 'Saludo', 'dialogue_type' => 'ambient'],
                ['id' => $despedida->id, 'title' => 'despedida', 'dialogue_type' => 'ambient'],
            ])
            ->where('entries.1.dialogue_nodes.0.title', 'Ajeno'));
    }

    public function test_la_ficha_se_abre_en_el_indice_y_las_rutas_antiguas_redirigen(): void
    {
        $lia = $this->project->characters()->create(['name' => 'Lía', 'role' => 'Protagonista']);

        $this->actingAs($this->user)
            ->get($this->url("?character={$lia->id}"))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Characters/Index', false)
                ->where('selected', $lia->id)
                ->where('entries.0.name', 'Lía')
                ->where('entries.0.image_url', null)
                ->missing('entries.0.image_path'));

        $this->actingAs($this->user)->get($this->url('/create'))->assertRedirect($this->url('?new=1'));
        $this->actingAs($this->user)->get($this->url("/{$lia->id}/edit"))->assertRedirect($this->url("?character={$lia->id}"));
        $this->actingAs($this->user)->get($this->url('?new=1'))->assertInertia(fn ($page) => $page->where('startNew', true));
    }

    public function test_crear_personaje_con_imagen_escenas_y_limites(): void
    {
        Storage::fake(Character::IMAGE_DISK);
        $scene = $this->project->scenes()->create(['title' => 'Entrada al refugio', 'order' => 1]);

        $this->actingAs($this->user)->post($this->url(), [
            'name' => 'Lía',
            'role' => 'Protagonista',
            'age' => 23,
            'background' => 'Busca a su hermano desaparecido',
            'limits' => 'Evita la violencia salvo para proteger a otros.',
            'image' => UploadedFile::fake()->image('lia.png', 300, 400),
            'scene_ids' => [$scene->id],
            'sync_scenes' => true,
        ])->assertSessionHasNoErrors();

        $lia = $this->project->characters()->firstOrFail();
        $this->assertSame('Evita la violencia salvo para proteger a otros.', $lia->limits);
        $this->assertSame([$scene->id], $lia->scenes()->pluck('scenes.id')->all());
        Storage::disk(Character::IMAGE_DISK)->assertExists($lia->image_path);
        $this->actingAs($this->user)->get($this->url("/{$lia->id}/image"))->assertOk();

        // Multipart sin escenas (la lista vacía no viaja): sync_scenes indica que hay que vaciarlas.
        $image = $lia->image_path;
        $this->actingAs($this->user)->post($this->url("/{$lia->id}"), [
            '_method' => 'put',
            'name' => 'Lía',
            'remove_image' => true,
            'sync_scenes' => true,
        ])->assertSessionHasNoErrors()->assertRedirect($this->url("?character={$lia->id}"));

        $lia->refresh();
        $this->assertNull($lia->image_path);
        $this->assertSame(0, $lia->scenes()->count());
        Storage::disk(Character::IMAGE_DISK)->assertMissing($image);
    }

    public function test_validaciones_y_acceso(): void
    {
        $other = $this->user->projects()->create(['title' => 'Otro', 'game_genre' => 'RPG', 'language' => 'es', 'narrative_type' => 'linear']);
        $foreignScene = $other->scenes()->create(['title' => 'Ajena', 'order' => 1]);

        $this->actingAs($this->user)
            ->post($this->url(), ['name' => '', 'scene_ids' => [$foreignScene->id], 'image' => UploadedFile::fake()->create('notas.pdf', 10, 'application/pdf')])
            ->assertSessionHasErrors(['name', 'scene_ids.0', 'image']);

        $lia = $this->project->characters()->create(['name' => 'Lía']);
        $intruder = User::factory()->create();
        $this->actingAs($intruder)->get($this->url())->assertForbidden();
        $this->actingAs($intruder)->get($this->url("/{$lia->id}/image"))->assertForbidden();
        $this->actingAs($this->user)->get("/projects/{$other->id}/characters/{$lia->id}/image")->assertNotFound();
    }
}
