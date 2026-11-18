<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\DialogueNode;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\User;
use App\Services\Branching\BranchingNodeService;
use App\Services\Script\ScriptService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Route as RouteDefinition;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class CollaborationTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private User $viewer;

    private User $editor;

    private User $admin;

    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.locale' => 'es']);

        $this->owner = User::factory()->create(['name' => 'Dueña']);
        $this->viewer = User::factory()->create(['name' => 'Lector', 'email' => 'lector@example.com']);
        $this->editor = User::factory()->create(['name' => 'Editora']);
        $this->admin = User::factory()->create(['name' => 'Admin']);
        $this->project = $this->owner->projects()->create(['title' => 'Faro', 'language' => 'es', 'narrative_type' => 'branching']);

        foreach (['viewer' => $this->viewer, 'editor' => $this->editor, 'admin' => $this->admin] as $role => $user) {
            $this->project->members()->create(['user_id' => $user->id, 'role' => $role, 'invited_by' => $this->owner->id]);
        }
    }

    public function test_el_administrador_invita_por_correo_a_un_usuario_existente(): void
    {
        $nueva = User::factory()->create(['name' => 'Nueva', 'email' => 'nueva@example.com']);

        $this->actingAs($this->admin)
            ->post($this->url('members'), ['email' => '  NUEVA@example.com ', 'role' => 'editor'])
            ->assertRedirect()
            ->assertSessionHas('success', 'Nueva ya tiene acceso al proyecto.');

        $member = ProjectMember::where('user_id', $nueva->id)->sole();
        $this->assertSame('editor', $member->role);
        $this->assertSame($this->admin->id, $member->invited_by);
        $this->actingAs($nueva)->get($this->url())->assertOk();
    }

    public function test_la_invitacion_rechaza_correos_sin_cuenta_al_dueno_y_duplicados(): void
    {
        $cases = [
            ['nadie@example.com', 'No hay ninguna cuenta de Gamerdust con ese correo. Pídele que se registre primero.'],
            [$this->owner->email, 'Esa persona es la dueña del proyecto.'],
            ['lector@example.com', 'Esa persona ya es miembro del proyecto.'],
        ];

        foreach ($cases as [$email, $message]) {
            $this->actingAs($this->owner)
                ->post($this->url('members'), ['email' => $email, 'role' => 'viewer'])
                ->assertSessionHasErrors(['email' => $message]);
        }

        $this->actingAs($this->owner)->post($this->url('members'), ['email' => 'lector@example.com', 'role' => 'jefe'])->assertSessionHasErrors('role');
        $this->assertSame(3, $this->project->members()->count());
    }

    public function test_solo_dueno_y_administrador_gestionan_miembros(): void
    {
        $member = $this->membership($this->viewer);

        foreach ([$this->editor, $this->viewer] as $user) {
            $this->actingAs($user)->post($this->url('members'), ['email' => 'x@example.com', 'role' => 'viewer'])->assertForbidden();
            $this->actingAs($user)->put($this->url("members/{$member->id}"), ['role' => 'admin'])->assertForbidden();
        }

        $this->actingAs($this->editor)->delete($this->url("members/{$member->id}"))->assertForbidden();
        $this->assertSame('viewer', $member->fresh()->role);

        $this->actingAs($this->admin)->put($this->url("members/{$member->id}"), ['role' => 'editor'])->assertRedirect();
        $this->assertSame('editor', $member->fresh()->role);

        // Un miembro de otro proyecto no se gestiona desde aquí.
        $other = $this->owner->projects()->create(['title' => 'Otro']);
        $foreign = $other->members()->create(['user_id' => $this->viewer->id, 'role' => 'viewer']);
        $this->actingAs($this->owner)->put($this->url("members/{$foreign->id}"), ['role' => 'admin'])->assertNotFound();
    }

    public function test_un_lector_puede_leer_y_exportar(): void
    {
        $scene = $this->scene();
        $node = $this->node();

        foreach (['', 'bible', 'characters', 'bible/locations', 'bible/rules', 'script', 'scenes', 'branching', 'mechanics', 'collaboration', 'analysis', 'analysis/evolution', 'reports', 'reports/analysis', 'script/print'] as $path) {
            $this->actingAs($this->viewer)->get($this->url($path))->assertOk();
        }

        $this->actingAs($this->viewer)->get($this->url('reports/markdown'))->assertOk();
        $this->actingAs($this->viewer)->get($this->url('reports/dialogues'))->assertOk();
        $this->actingAs($this->viewer)->getJson($this->url('branching/graph'))->assertOk();
        $this->actingAs($this->viewer)->getJson($this->url("branching/nodes/{$node->id}/context"))->assertOk();
        $this->actingAs($this->viewer)->getJson($this->url("script/scenes/{$scene->id}/versions"))->assertOk();
        $this->actingAs($this->viewer)->getJson($this->url('analysis/emotion-timeline'))->assertOk();

        $this->actingAs($this->viewer)->get($this->url())
            ->assertInertia(fn ($page) => $page->where('projectAccess.role', 'viewer')->where('projectAccess.can_update', false)->where('projectAccess.can_manage', false));
    }

    /**
     * Recorre TODAS las rutas de escritura del proyecto (Inertia y JSON) como lector: todas dan 403.
     * Si alguien añade una ruta que escribe sin pedir `update`, este test falla.
     */
    public function test_un_lector_recibe_403_en_todas_las_rutas_de_escritura(): void
    {
        Http::fake(fn () => throw new \RuntimeException('Un lector nunca debe llegar a la IA.'));
        // Cada ruta de IA se prueba dos veces: sin esto el límite `ai` (10/min) respondería 429 antes del 403.
        config(['gamerdust.ai.rate_limit_per_minute' => 1000]);
        $params = $this->routeParameters();
        $before = $this->snapshot();
        $checked = 0;

        foreach (Route::getRoutes() as $route) {
            /** @var RouteDefinition $route */
            $method = collect($route->methods())->first(fn ($method) => ! in_array($method, ['GET', 'HEAD'], true));

            if (! $method || ! str_starts_with($route->uri(), 'projects/{project}') || $route->getName() === 'projects.favorite') {
                continue;
            }

            $uri = preg_replace_callback('/\{(\w+)\??\}/', function ($match) use ($params, $route) {
                $this->assertArrayHasKey($match[1], $params, "Falta un valor de prueba para {{$match[1]}} en {$route->uri()}");

                return $params[$match[1]];
            }, $route->uri());

            foreach ([true, false] as $json) {
                $response = $json ? $this->actingAs($this->viewer)->json($method, "/{$uri}", []) : $this->actingAs($this->viewer)->call($method, "/{$uri}");
                $this->assertSame(403, $response->status(), "{$method} /{$uri} (".($json ? 'JSON' : 'Inertia').") debería dar 403 a un lector y dio {$response->status()}");
            }

            $checked++;
        }

        $this->assertGreaterThan(45, $checked);
        $this->assertSame($before, $this->snapshot(), 'Un lector no debe cambiar nada.');
    }

    public function test_un_editor_escribe_pero_no_gestiona_ni_borra_el_proyecto(): void
    {
        $scene = $this->scene();

        $this->actingAs($this->editor)
            ->putJson($this->url("script/scenes/{$scene->id}"), [
                'updated_at' => $scene->updated_at->toJSON(),
                'elements' => [['id' => 'a', 'kind' => 'action', 'text' => 'La editora escribe.']],
                'characters' => [],
                'location_id' => null,
            ])
            ->assertOk();
        $this->assertSame('La editora escribe.', $scene->fresh()->script[0]['text']);

        $this->actingAs($this->editor)->postJson($this->url('branching/nodes'), ['title' => 'Nuevo', 'text' => 'Hola'])->assertSuccessful();
        $this->actingAs($this->editor)->get($this->url())->assertInertia(fn ($page) => $page->where('projectAccess.can_update', true)->where('projectAccess.can_manage', false));

        $this->actingAs($this->editor)->delete("/projects/{$this->project->id}")->assertForbidden();
        $this->actingAs($this->admin)->delete("/projects/{$this->project->id}")->assertForbidden();
        $this->assertModelExists($this->project);
    }

    public function test_un_miembro_retirado_pierde_el_acceso(): void
    {
        $member = $this->membership($this->editor);
        $scene = $this->scene();

        $this->actingAs($this->editor)->get($this->url())->assertOk();
        $this->actingAs($this->owner)->delete($this->url("members/{$member->id}"))->assertRedirect()->assertSessionHas('success');

        $this->actingAs($this->editor)->get($this->url())->assertForbidden();
        $this->actingAs($this->editor)->get($this->url('script'))->assertForbidden();
        $this->actingAs($this->editor)->getJson($this->url('branching/graph'))->assertForbidden();
        $this->actingAs($this->editor)->putJson($this->url("script/scenes/{$scene->id}"), ['elements' => [], 'characters' => []])->assertForbidden();
        $this->actingAs($this->editor)->get('/projects')->assertInertia(fn ($page) => $page->where('projects.total', 0));
    }

    public function test_un_miembro_puede_salir_del_proyecto(): void
    {
        $member = $this->membership($this->viewer);

        $this->actingAs($this->viewer)->delete($this->url("members/{$member->id}"))->assertRedirect('/projects');
        $this->assertModelMissing($member);
        $this->actingAs($this->viewer)->get($this->url())->assertForbidden();
    }

    public function test_un_proyecto_ajeno_sigue_cerrado(): void
    {
        $stranger = User::factory()->create();

        $this->actingAs($stranger)->get($this->url())->assertForbidden();
        $this->actingAs($stranger)->getJson($this->url('branching/graph'))->assertForbidden();
        $this->actingAs($stranger)->post($this->url('members'), ['email' => $stranger->email, 'role' => 'admin'])->assertForbidden();
        $this->actingAs($stranger)->get('/projects')->assertInertia(fn ($page) => $page->where('projects.total', 0));
    }

    public function test_la_lista_incluye_los_compartidos_con_rol_dueno_y_favorito_personal(): void
    {
        $this->viewer->projects()->create(['title' => 'Mío']);

        $this->actingAs($this->viewer)->patch("/projects/{$this->project->id}/favorite")->assertRedirect();
        $this->assertTrue($this->membership($this->viewer)->favorite);
        $this->assertFalse($this->project->fresh()->favorite, 'El favorito del lector no cambia el del dueño.');

        $this->actingAs($this->viewer)->get('/projects')->assertInertia(function ($page) {
            $projects = collect($page->toArray()['props']['projects']['data'])->keyBy('title');
            $this->assertSame(['owner', 'viewer'], [$projects['Mío']['role'], $projects['Faro']['role']]);
            $this->assertSame('Dueña', $projects['Faro']['owner']);
            $this->assertNull($projects['Mío']['owner']);
            $this->assertTrue($projects['Faro']['favorite']);
            $this->assertArrayNotHasKey('members', $projects['Faro']);
        });
    }

    public function test_colaboracion_muestra_el_equipo_y_cada_uno_borra_sus_comentarios(): void
    {
        $this->actingAs($this->viewer)->get($this->url('collaboration'))->assertInertia(fn ($page) => $page
            ->component('Collaboration/Index', false)
            ->has('members', 4)
            ->where('members.0.role', 'owner')
            ->where('members.0.name', 'Dueña')
            ->where('roles', ['admin', 'editor', 'viewer']));

        $comment = $this->project->comments()->create(['user_id' => $this->editor->id, 'text' => 'Idea']);
        $this->actingAs($this->admin)->post($this->url('comments'), ['text' => 'Otra'])->assertRedirect();
        $mine = Comment::where('user_id', $this->admin->id)->sole();

        // Otro editor no puede borrar el de la editora; el admin sí, y cada uno el suyo.
        $other = User::factory()->create();
        $this->project->members()->create(['user_id' => $other->id, 'role' => 'editor']);
        $this->actingAs($other)->delete($this->url("comments/{$comment->id}"))->assertForbidden();
        $this->actingAs($this->editor)->delete($this->url("comments/{$mine->id}"))->assertForbidden();
        $this->actingAs($this->admin)->delete($this->url("comments/{$comment->id}"))->assertRedirect();
        $this->assertModelMissing($comment);
    }

    private function membership(User $user): ProjectMember
    {
        return ProjectMember::where('project_id', $this->project->id)->where('user_id', $user->id)->sole();
    }

    private function scene()
    {
        $script = app(ScriptService::class);

        return $this->project->scenes()->first()
            ?? $script->save($script->createScene($this->project, 'El faro', 'Acto I', $this->owner->id), [['id' => '1', 'kind' => 'action', 'text' => 'Mara sube.']], [], null, $this->owner->id);
    }

    private function node(): DialogueNode
    {
        if (! $this->project->dialogueNodes()->exists()) {
            app(BranchingNodeService::class)->create($this->project, ['title' => 'Inicio', 'text' => 'Hola {{Final}}']);
        }

        return $this->project->dialogueNodes()->where('title', 'Inicio')->firstOrFail();
    }

    /** Un valor real del proyecto para cada parámetro de ruta. */
    private function routeParameters(): array
    {
        $scene = $this->scene();
        $node = $this->node();
        $option = $node->options()->firstOrFail();
        $variable = $this->project->branchingVariables()->create(['key' => 'confianza', 'type' => 'number', 'initial_value' => 0]);
        $character = $this->project->characters()->create(['name' => 'Mara']);
        $rule = $this->project->loreEntries()->create(['type' => 'rule', 'title' => 'Gravedad']);
        $lore = $this->project->loreEntries()->create(['type' => 'history', 'title' => 'El naufragio']);
        $mechanic = $this->project->mechanics()->create(['title' => 'Linterna', 'kind' => 'exploration']);
        $comment = $this->project->comments()->create(['user_id' => $this->owner->id, 'text' => 'Nota']);
        $validation = $this->project->narrativeValidations()->create(['validation_type' => 'missing_project_premise', 'severity' => 'medium', 'message' => 'Falta premisa', 'status' => 'pending']);

        return [
            'project' => $this->project->id,
            'kind' => 'rules',
            'loreEntry' => $rule->id,
            'lore' => $lore->id,
            'character' => $character->id,
            'scene' => $scene->id,
            'dialogue' => $node->id,
            'node' => $node->id,
            'option' => $option->id,
            'variable' => $variable->id,
            'mechanic' => $mechanic->id,
            'comment' => $comment->id,
            'version' => $scene->versions()->value('id'),
            'validation' => $validation->id,
            // El lector no es admin: retirar a otro miembro también es escritura.
            'member' => $this->membership($this->editor)->id,
        ];
    }

    /** Estado de las tablas que un lector podría tocar. */
    private function snapshot(): array
    {
        $project = $this->project->fresh();

        return [
            'project' => $project->only(['title', 'description', 'premise', 'favorite']),
            'scenes' => $project->scenes()->get(['id', 'title', 'script', 'updated_at'])->toArray(),
            'nodes' => $project->dialogueNodes()->get(['id', 'title', 'text', 'pos_x', 'updated_at'])->toArray(),
            'options' => $project->dialogueNodes()->withCount('options')->pluck('options_count')->all(),
            'counts' => [
                $project->characters()->count(), $project->loreEntries()->count(), $project->mechanics()->count(), $project->comments()->count(),
                $project->members()->count(), $project->branchingVariables()->count(), $project->emotionalAnalyses()->count(), $project->costEstimations()->count(),
            ],
            'members' => $project->members()->pluck('role', 'user_id')->all(),
            'validations' => $project->narrativeValidations()->pluck('status', 'id')->all(),
        ];
    }

    private function url(string $path = ''): string
    {
        return rtrim("/projects/{$this->project->id}/{$path}", '/');
    }
}
