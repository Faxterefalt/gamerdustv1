<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use App\Services\Narrative\NarrativeValidationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BibleEntriesTest extends TestCase
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

    private function url(string $kind, string $path = ''): string
    {
        return "/projects/{$this->project->id}/bible/{$kind}{$path}";
    }

    private function place(array $overrides = []): array
    {
        return ['title' => 'Refugio de Brasa', 'subtype' => 'interior', 'narrative_function' => 'Primer lugar seguro', ...$overrides];
    }

    private function rule(array $overrides = []): array
    {
        return [
            'title' => 'Toque de queda',
            'statement' => 'Nadie puede estar en la superficie de noche.',
            'rigidity' => 'unbreakable',
            'scope' => 'linked',
            'narrative_function' => 'Da urgencia al acto 2',
            ...$overrides,
        ];
    }

    public function test_las_pestanas_de_la_biblia_responden(): void
    {
        foreach (['/bible', '/bible/locations', '/bible/rules', '/characters'] as $path) {
            $this->actingAs($this->user)->get("/projects/{$this->project->id}{$path}")->assertOk();
        }

        $this->actingAs($this->user)->get("/projects/{$this->project->id}/bible/factions")->assertNotFound();
    }

    public function test_lugar_con_jerarquia_y_vinculos(): void
    {
        $scene = $this->project->scenes()->create(['title' => 'Entrada al refugio', 'order' => 1]);
        $luna = $this->project->characters()->create(['name' => 'Luna']);
        $district = $this->project->loreEntries()->create(['title' => 'Distrito Bajo', 'type' => 'location']);
        $curfew = $this->project->loreEntries()->create(['title' => 'Toque de queda', 'type' => 'rule']);
        $faction = $this->project->loreEntries()->create(['title' => 'Los Faroleros', 'type' => 'faction']);

        $this->actingAs($this->user)->post($this->url('locations'), $this->place([
            'parent_id' => $district->id,
            'access' => 'Solo de noche',
            'scene_ids' => [$scene->id],
            'characters' => [['id' => $luna->id, 'role' => 'breaks']],
            'rule_ids' => [$curfew->id],
            'lore_ids' => [$faction->id],
        ]))->assertSessionHasNoErrors()->assertRedirect();

        $place = $this->project->loreEntries()->where('title', 'Refugio de Brasa')->firstOrFail();
        $this->assertSame('location', $place->type);
        $this->assertSame($district->id, $place->parent_id);
        $this->assertSame($place->id, $scene->fresh()->location_id);
        $this->assertNull($place->characters()->first()->pivot->role, 'Los lugares no guardan relación del personaje.');

        // El vínculo lugar ↔ regla se ve desde los dos lados.
        $this->assertSame([$place->id], $curfew->linkedEntries()->pluck('lore_entries.id')->all());

        $this->actingAs($this->user)
            ->get($this->url('locations', "?entry={$place->id}"))
            ->assertInertia(fn ($page) => $page
                // Las páginas viven en features/*/pages (resolve-page.ts), no en la ruta por defecto de Inertia.
                ->component('Bible/Locations', false)
                ->where('selected', $place->id)
                ->where('entries.1.scene_ids', [$scene->id])
                ->where('entries.1.rule_ids', [$curfew->id])
                ->where('entries.1.lore_ids', [$faction->id]));

        // Quitar la escena (PUT por POST con _method, como hace el formulario).
        $this->actingAs($this->user)->post($this->url('locations', "/{$place->id}"), $this->place([
            '_method' => 'put',
            'scene_ids' => [],
            'rule_ids' => [$curfew->id],
        ]))->assertSessionHasNoErrors();

        $this->assertNull($scene->fresh()->location_id);
        $this->assertSame([], $faction->linkedEntries()->pluck('lore_entries.id')->all());
    }

    public function test_regla_con_vinculos_y_relacion_de_personajes(): void
    {
        $place = $this->project->loreEntries()->create(['title' => 'La Superficie', 'type' => 'location']);
        $faction = $this->project->loreEntries()->create(['title' => 'Los Faroleros', 'type' => 'faction']);
        $scene = $this->project->scenes()->create(['title' => 'Pasillo vigilado', 'order' => 1]);
        $tomas = $this->project->characters()->create(['name' => 'Tomás']);
        $mechanic = $this->project->mechanics()->create(['title' => 'Sigilo', 'kind' => 'exploration', 'icon' => 'footsteps', 'description' => 'Pasar sin ser visto']);
        $this->actingAs($this->user)->post($this->url('rules'), $this->rule([
            'subtype' => 'society',
            'consequence' => 'Los drones marcan al infractor',
            'location_ids' => [$place->id],
            'scene_ids' => [$scene->id],
            'characters' => [['id' => $tomas->id, 'role' => 'breaks']],
            'mechanic_ids' => [$mechanic->id],
        ]))->assertSessionHasNoErrors();

        $rule = $this->project->loreEntries()->where('title', 'Toque de queda')->firstOrFail();
        // Vínculo regla ↔ facción creado desde otro sitio: guardar la regla no debe borrarlo.
        DB::table('lore_entry_links')->insert([['lore_entry_id' => $rule->id, 'linked_id' => $faction->id], ['lore_entry_id' => $faction->id, 'linked_id' => $rule->id]]);

        $this->assertSame('rule', $rule->type);
        $this->assertSame('breaks', $rule->characters()->first()->pivot->role);
        $this->assertSame([$scene->id], $rule->scenes()->pluck('scenes.id')->all());
        $this->assertSame([$mechanic->id], $rule->mechanics()->pluck('mechanics.id')->all());
        $this->assertSame([$rule->id], $place->linkedEntries()->pluck('lore_entries.id')->all());

        $this->actingAs($this->user)->put($this->url('rules', "/{$rule->id}"), $this->rule(['location_ids' => []]))->assertSessionHasNoErrors();
        $this->assertSame([], $place->linkedEntries()->pluck('lore_entries.id')->all());
        $this->assertSame([$faction->id], $rule->linkedEntries()->pluck('lore_entries.id')->all());
        $this->assertSame(0, $rule->characters()->count());

        // Una regla inquebrantable que un personaje rompe aparece en el análisis.
        $this->actingAs($this->user)->put($this->url('rules', "/{$rule->id}"), $this->rule(['characters' => [['id' => $tomas->id, 'role' => 'breaks']]]));
        $types = app(NarrativeValidationService::class)->run($this->project->fresh())->pluck('validation_type');
        $this->assertContains('unbreakable_rule_broken', $types);
    }

    public function test_validaciones_de_las_fichas(): void
    {
        $other = $this->user->projects()->create(['title' => 'Otro', 'game_genre' => 'RPG', 'language' => 'es', 'narrative_type' => 'linear']);
        $foreignScene = $other->scenes()->create(['title' => 'Ajena', 'order' => 1]);
        $faction = $this->project->loreEntries()->create(['title' => 'Los Faroleros', 'type' => 'faction']);

        $this->actingAs($this->user)
            ->post($this->url('locations'), $this->place(['scene_ids' => [$foreignScene->id], 'rule_ids' => [$faction->id], 'narrative_function' => '']))
            ->assertSessionHasErrors(['scene_ids.0', 'rule_ids.0', 'narrative_function']);

        $this->actingAs($this->user)
            ->post($this->url('rules'), $this->rule(['rigidity' => 'sometimes', 'statement' => '', 'location_ids' => [$faction->id]]))
            ->assertSessionHasErrors(['rigidity', 'statement', 'location_ids.0']);

        // Sin ciclos en la jerarquía de lugares.
        $city = $this->project->loreEntries()->create(['title' => 'Ciudad', 'type' => 'location']);
        $district = $this->project->loreEntries()->create(['title' => 'Distrito', 'type' => 'location', 'parent_id' => $city->id]);
        $this->actingAs($this->user)
            ->put($this->url('locations', "/{$city->id}"), $this->place(['title' => 'Ciudad', 'parent_id' => $district->id]))
            ->assertSessionHasErrors('parent_id');
    }

    public function test_acceso_y_pertenencia(): void
    {
        $rule = $this->project->loreEntries()->create(['title' => 'Regla', 'type' => 'rule']);
        $intruder = User::factory()->create();

        $this->actingAs($intruder)->get($this->url('rules'))->assertForbidden();
        $this->actingAs($intruder)->put($this->url('rules', "/{$rule->id}"), $this->rule())->assertForbidden();

        // Una regla no se edita desde la pestaña de lugares, ni desde otro proyecto.
        $this->actingAs($this->user)->put($this->url('locations', "/{$rule->id}"), $this->place())->assertNotFound();
        $other = $this->user->projects()->create(['title' => 'Otro', 'game_genre' => 'RPG', 'language' => 'es', 'narrative_type' => 'linear']);
        $this->actingAs($this->user)->put("/projects/{$other->id}/bible/rules/{$rule->id}", $this->rule())->assertNotFound();

        $this->actingAs($this->user)->delete($this->url('rules', "/{$rule->id}"))->assertRedirect($this->url('rules'));
        $this->assertModelMissing($rule);
    }
}
