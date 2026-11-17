<?php

namespace Tests\Feature\Ai;

use App\Models\Character;
use App\Models\Project;
use App\Models\Scene;
use App\Models\User;
use App\Services\Script\ScriptService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class EmotionTimelineTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Project $project;

    private Character $mara;

    private Character $iker;

    /** @var list<Scene> */
    private array $scenes = [];

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'app.locale' => 'es',
            'gamerdust.ai.driver' => 'groq',
            'services.groq.key' => 'test-secret-key',
        ]);

        $this->user = User::factory()->create();
        $this->project = $this->user->projects()->create(['title' => 'Faro', 'game_genre' => 'Aventura', 'language' => 'es', 'narrative_type' => 'linear']);
        $this->mara = $this->project->characters()->create(['name' => 'Mara', 'initial_emotion' => 'hope', 'initial_intensity' => 'high']);
        $this->iker = $this->project->characters()->create(['name' => 'Íker']);

        $script = app(ScriptService::class);
        foreach (['La huida' => [$this->mara->id, $this->iker->id], 'El faro' => [$this->mara->id], 'El regreso' => [$this->mara->id]] as $title => $cast) {
            $scene = $script->createScene($this->project, $title, 'Acto I', $this->user->id);
            $this->scenes[] = $script->save($scene, [['id' => '1', 'kind' => 'action', 'text' => "Mara en {$title}."]], $cast, null, $this->user->id);
        }

        // La IA devuelve a ambos; el validador descarta a quien no está en la escena.
        Http::fake(['api.groq.com/*' => Http::response([
            'choices' => [['message' => ['content' => json_encode([
                'scene' => ['v' => 0.1, 'a' => 0.85, 'd' => 0.15, 'emotion' => 'fear', 'summary' => 'Miedo.', 'evidence' => 'Mara', 'change_justified' => false, 'change_explanation' => ''],
                'characters' => [
                    ['character_id' => $this->mara->id, 'name' => 'Mara', 'v' => 0.1, 'a' => 0.85, 'd' => 0.15, 'emotion' => 'fear', 'evidence' => 'Mara', 'out_of_character' => false, 'out_of_character_reason' => '', 'change_justified' => false, 'change_explanation' => 'Sin causa.'],
                    ['character_id' => $this->iker->id, 'name' => 'Íker', 'v' => 0.5, 'a' => 0.4, 'd' => 0.5, 'emotion' => 'neutral', 'evidence' => 'Íker', 'out_of_character' => false, 'out_of_character_reason' => '', 'change_justified' => true, 'change_explanation' => ''],
                ],
                'inconsistencies' => [],
                'suggestions' => [],
            ])], 'finish_reason' => 'stop']],
            'usage' => ['prompt_tokens' => 10, 'completion_tokens' => 10, 'total_tokens' => 20],
        ])]);
    }

    public function test_timeline_has_scene_gaps_and_character_start_points(): void
    {
        $this->analyze($this->scenes[0]);
        $this->analyze($this->scenes[2]);

        $response = $this->actingAs($this->user)->getJson($this->url())->assertOk();

        $response
            ->assertJsonCount(3, 'scenes')
            ->assertJsonPath('scenes.0.code', 'E01')
            ->assertJsonPath('scenes.0.analyzed', true)
            ->assertJsonPath('scenes.0.emotion', 'fear')
            ->assertJsonPath('scenes.0.labels.tone', 'Muy negativo')
            // E02 sin analizar: hueco en la línea.
            ->assertJsonPath('scenes.1.analyzed', false)
            ->assertJsonPath('scenes.1.vad', null)
            ->assertJsonPath('scenes.2.stale', false);

        $characters = collect($response->json('characters'))->keyBy('name');

        // Mara: "Inicio" del autor + E01 + E03 (no aparece analizada en E02).
        $mara = $characters['Mara']['points'];
        $this->assertSame(['author', 'ai', 'ai'], array_column($mara, 'origin'));
        $this->assertSame([null, 'E01', 'E03'], array_column($mara, 'code'));
        $this->assertSame(['v' => 0.75, 'a' => 0.8, 'd' => 0.55], $mara[0]['vad']);
        $this->assertSame('red', $mara[1]['alert']);
        // En E03 ya no hay salto: venía de miedo en E01.
        $this->assertNull($mara[2]['alert']);

        // Íker no tiene estado inicial: solo el punto detectado en E01.
        $this->assertSame(['E01'], array_column($characters['Íker']['points'], 'code'));

        $reviews = $response->json('reviews');
        $this->assertContains(['E01', 'Mara'], array_map(fn ($review) => [$review['code'], $review['name']], $reviews));
        $this->assertSame($this->scenes[0]->id, $reviews[0]['scene_id']);
    }

    public function test_editing_a_scene_marks_its_points_stale(): void
    {
        $this->analyze($this->scenes[0]);

        app(ScriptService::class)->save($this->scenes[0], [['id' => '2', 'kind' => 'action', 'text' => 'Otro texto.']], [$this->mara->id, $this->iker->id], null, $this->user->id);

        $response = $this->actingAs($this->user)->getJson($this->url())->assertOk();
        $response->assertJsonPath('scenes.0.stale', true);

        $mara = collect($response->json('characters'))->firstWhere('name', 'Mara');
        $this->assertTrue($mara['points'][1]['stale']);
    }

    public function test_empty_project_and_authorization(): void
    {
        $this->actingAs($this->user)->getJson($this->url())
            ->assertOk()
            ->assertJsonPath('scenes.0.analyzed', false)
            ->assertJsonPath('reviews', []);

        $this->actingAs(User::factory()->create())->getJson($this->url())->assertForbidden();
        $this->actingAs(User::factory()->create())->get("/projects/{$this->project->id}/analysis/evolution")->assertForbidden();
        Http::assertNothingSent();
    }

    public function test_evolution_page_and_metrics_page_without_the_old_panel(): void
    {
        $this->actingAs($this->user)
            ->get("/projects/{$this->project->id}/analysis/evolution")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Analysis/Evolution', false)->has('emotionCatalog.emotions.fear'));

        $this->actingAs($this->user)
            ->get("/projects/{$this->project->id}/analysis")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Analysis/Index', false)->missing('analysis')->missing('dialogues'));
    }

    private function analyze(Scene $scene): void
    {
        $this->actingAs($this->user)->postJson("/projects/{$this->project->id}/script/scenes/{$scene->id}/analyze")->assertOk();
    }

    private function url(): string
    {
        return "/projects/{$this->project->id}/analysis/emotion-timeline";
    }
}
