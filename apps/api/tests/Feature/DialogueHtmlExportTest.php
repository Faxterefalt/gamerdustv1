<?php

namespace Tests\Feature;

use App\Models\DialogueNode;
use App\Models\DialogueOption;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DialogueHtmlExportTest extends TestCase
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

    private function node(Project $project, string $title, string $text): DialogueNode
    {
        return DialogueNode::create([
            'project_id' => $project->id,
            'node_key' => strtolower(str_replace(' ', '_', $title)),
            'title' => $title,
            'dialogue_type' => 'interactive_alternative_paths',
            'text' => $text,
        ]);
    }

    private function url(?Project $project = null): string
    {
        return '/projects/'.($project ?? $this->project)->id.'/reports/dialogues';
    }

    public function test_descarga_un_html_autonomo_con_el_grafo_de_dialogos(): void
    {
        $inicio = $this->node($this->project, 'Inicio', 'El guardia te mira. {{Huir}} o hablar.');
        $huir = $this->node($this->project, 'Huir', 'Corres hacia el puerto.');
        $hablar = $this->node($this->project, 'Hablar', 'Fin de la charla.');
        DialogueOption::create(['dialogue_node_id' => $inicio->id, 'next_dialogue_node_id' => $huir->id, 'player_option' => 'Huir', 'source_ref' => 'huir']);
        DialogueOption::create(['dialogue_node_id' => $inicio->id, 'next_dialogue_node_id' => $hablar->id, 'player_option' => 'Saludar', 'consequence' => 'El guardia confía']);

        $response = $this->actingAs($this->user)->get($this->url())->assertOk();
        $html = $response->streamedContent();

        $this->assertStringContainsString('attachment', $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString('la-ciudad-que-suena-', $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString('.html', $response->headers->get('Content-Disposition'));
        $this->assertStringStartsWith('text/html', $response->headers->get('Content-Type'));

        // Autónomo: sin recursos externos.
        $this->assertStringNotContainsString('<script src', $html);
        $this->assertStringNotContainsString('<link', $html);

        $data = $this->graphData($html);
        $this->assertSame($inicio->id, $data['start_node_id']);
        $this->assertCount(3, $data['nodes']);
        $this->assertCount(2, $data['edges']);
        $this->assertSame(['Huir', 'Saludar'], array_column($data['nodes'][0]['options'], 'player_option'));
        $this->assertSame('El guardia confía', $data['nodes'][0]['options'][1]['consequence']);
    }

    public function test_el_texto_de_los_nodos_no_puede_cerrar_el_script(): void
    {
        $this->node($this->project, 'Trampa', '</script><script>alert(1)</script>');

        $html = $this->actingAs($this->user)->get($this->url())->streamedContent();

        $this->assertStringNotContainsString('<script>alert(1)', $html);
        $this->assertSame('</script><script>alert(1)</script>', $this->graphData($html)['nodes'][0]['text']);
    }

    public function test_proyecto_sin_dialogos_exporta_igualmente(): void
    {
        $html = $this->actingAs($this->user)->get($this->url())->assertOk()->streamedContent();

        $this->assertSame([], $this->graphData($html)['nodes']);
        preg_match('#<script type="application/json" id="texts-data">(.*?)</script>#s', $html, $match);
        $this->assertSame(__('This project has no dialogues yet.'), json_decode($match[1], true)['texts']['empty']);
    }

    public function test_solo_el_propietario_puede_exportar(): void
    {
        $other = User::factory()->create();

        $this->actingAs($other)->get($this->url())->assertForbidden();
    }

    public function test_no_incluye_nodos_de_otros_proyectos(): void
    {
        $ajeno = $this->user->projects()->create(['title' => 'Otro', 'language' => 'es', 'narrative_type' => 'branching']);
        $this->node($ajeno, 'Secreto', 'No debería salir');
        $this->node($this->project, 'Propio', 'Hola');

        $data = $this->graphData($this->actingAs($this->user)->get($this->url())->streamedContent());

        $this->assertSame(['Propio'], array_column($data['nodes'], 'title'));
    }

    public function test_reportes_ofrece_la_descarga_con_el_numero_de_nodos(): void
    {
        $this->node($this->project, 'Inicio', 'Hola');

        $this->actingAs($this->user)->get("/projects/{$this->project->id}/reports")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Reports/Index', false)->where('counts.dialogues', 1));
    }

    private function graphData(string $html): array
    {
        $this->assertMatchesRegularExpression('#<script type="application/json" id="graph-data">(.*?)</script>#s', $html);
        preg_match('#<script type="application/json" id="graph-data">(.*?)</script>#s', $html, $match);

        return json_decode($match[1], true, flags: JSON_THROW_ON_ERROR);
    }
}
