<?php

namespace Tests\Feature\Ai;

use App\Models\AiGeneration;
use App\Models\Character;
use App\Models\CharacterEmotionalState;
use App\Models\EmotionalAnalysis;
use App\Models\Project;
use App\Models\Scene;
use App\Models\User;
use App\Services\Script\ScriptService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SceneEmotionAnalysisTest extends TestCase
{
    use RefreshDatabase;

    private const URL = 'https://api.groq.com/openai/v1/chat/completions';

    private User $user;

    private Project $project;

    private Character $mara;

    private Character $iker;

    private Scene $scene;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'app.locale' => 'es',
            'gamerdust.ai.driver' => 'groq',
            'services.groq.key' => 'test-secret-key',
            'services.groq.model' => 'primary-model',
            'services.groq.fallback_model' => 'fallback-model',
        ]);

        $this->user = User::factory()->create();
        $this->project = $this->user->projects()->create([
            'title' => 'Faro', 'game_genre' => 'Aventura', 'language' => 'es', 'narrative_type' => 'linear',
            'premise' => 'Una farera guarda un secreto.',
        ]);

        $this->mara = $this->project->characters()->create([
            'name' => 'Mara', 'personality' => 'Valiente y serena', 'fear' => 'El mar de noche',
            'initial_emotion' => 'hope', 'initial_intensity' => 'high',
        ]);
        $this->iker = $this->project->characters()->create(['name' => 'Íker', 'personality' => 'Burlón']);

        $port = $this->project->loreEntries()->create(['title' => 'Puerto viejo', 'type' => 'location', 'description' => 'Muelles podridos.']);
        $rule = $this->project->loreEntries()->create(['title' => 'Nadie navega de noche', 'type' => 'rule', 'statement' => 'Zarpar de noche está prohibido.', 'rigidity' => 'unbreakable']);
        $port->linkedEntries()->attach($rule->id);
        $rule->linkedEntries()->attach($port->id);
        $rule->characters()->attach($this->mara->id, ['role' => 'breaks']);

        $this->scene = $this->writeScene('La huida', [
            ['id' => '1', 'kind' => 'heading', 'text' => 'EXT. PUERTO VIEJO - NOCHE'],
            ['id' => '2', 'kind' => 'action', 'text' => 'Mara suelta las amarras temblando.'],
            ['id' => '3', 'kind' => 'character', 'text' => 'Mara'],
            ['id' => '4', 'kind' => 'dialogue', 'text' => 'No hay vuelta atrás.'],
        ], [$this->mara->id, $this->iker->id], $port->id);
    }

    public function test_analysis_saves_scene_characters_and_generation_in_narrative_language(): void
    {
        Http::fake([self::URL => Http::response($this->completion($this->aiResult()))]);

        $response = $this->analyze()->assertOk();

        $response
            ->assertJsonPath('analysis.source', 'groq')
            ->assertJsonPath('analysis.model', 'primary-model')
            ->assertJsonPath('analysis.from_cache', false)
            ->assertJsonPath('analysis.degraded', false)
            ->assertJsonPath('analysis.scene.emotion', 'fear')
            ->assertJsonPath('analysis.scene.labels.tone', 'Muy negativo')
            ->assertJsonPath('analysis.scene.labels.tension', 'Alta')
            ->assertJsonPath('analysis.scene.labels.control', 'Vulnerable')
            ->assertJsonPath('analysis.scene.vad.v', 0.1)
            // Solo dos personajes: el id ajeno a la escena se descarta.
            ->assertJsonCount(2, 'analysis.characters')
            ->assertJsonPath('analysis.characters.0.name', 'Mara')
            // Esperanza alta del autor → miedo sin causa: alerta roja.
            ->assertJsonPath('analysis.characters.0.change.previous.origin', 'author')
            ->assertJsonPath('analysis.characters.0.change.alert', 'red')
            ->assertJsonPath('analysis.characters.1.change.previous.origin', 'none')
            ->assertJsonPath('analysis.characters.1.change.alert', null)
            ->assertJsonPath('analysis.inconsistencies.0.url', "/projects/{$this->project->id}/bible/rules?entry=".$this->project->loreEntries()->where('type', 'rule')->value('id'))
            ->assertJsonCount(1, 'analysis.suggestions');

        // El texto que ve el autor no habla de VAD.
        $visible = json_encode([$response->json('analysis.scene.labels'), $response->json('analysis.scene.summary')]);
        $this->assertDoesNotMatchRegularExpression('/vad|valen|arousal|dominan/i', $visible);

        $analysis = EmotionalAnalysis::sole();
        $this->assertSame('groq', $analysis->source);
        $this->assertSame(64, strlen($analysis->content_hash));
        $this->assertSame($this->scene->versions()->value('id'), $analysis->scene_version_id);
        $this->assertSame(['Muestra el miedo en un gesto.'], $analysis->suggestions);

        $states = CharacterEmotionalState::orderBy('character_id')->get();
        $this->assertCount(2, $states);
        $this->assertTrue($states[0]->abrupt_change);
        $this->assertFalse($states[0]->change_justified);
        $this->assertSame('No hay vuelta atrás.', $states[0]->evidence);

        $generation = AiGeneration::sole();
        $this->assertSame(['scene_analysis', 'ok'], [$generation->generation_type, $generation->status]);

        // El contexto de la Biblia viaja en el mensaje de usuario.
        Http::assertSent(function (Request $request) {
            $user = $request['messages'][1]['content'];

            return str_contains($user, 'LUGAR: "Puerto viejo"')
                && str_contains($user, '"Nadie navega de noche" (inquebrantable)')
                && str_contains($user, "[character_id:{$this->mara->id}] Mara")
                && str_contains($user, 'rompe "Nadie navega de noche"')
                && str_contains($user, 'hope (v=0.75, a=0.80, d=0.55) · origen: author')
                && str_contains($user, 'MARA: No hay vuelta atrás.')
                && str_contains($request['messages'][0]['content'], 'joy, hope, tenderness')
                && $request['response_format']['json_schema']['name'] === 'scene_emotion_analysis';
        });
    }

    public function test_unchanged_scene_reuses_the_analysis_and_reanalyze_forces_a_call(): void
    {
        Http::fake([self::URL => Http::response($this->completion($this->aiResult()))]);

        $first = $this->analyze()->json('analysis.id');
        $this->analyze()->assertJsonPath('analysis.from_cache', true)->assertJsonPath('analysis.id', $first);
        Http::assertSentCount(1);

        $this->analyze(['force' => true])->assertJsonPath('analysis.from_cache', false);
        Http::assertSentCount(2);
        // Reanalizar sustituye los estados de la escena.
        $this->assertSame(2, CharacterEmotionalState::count());
    }

    public function test_latest_marks_the_analysis_stale_after_editing(): void
    {
        Http::fake([self::URL => Http::response($this->completion($this->aiResult()))]);

        $this->actingAs($this->user)->getJson($this->sceneUrl('/analysis'))->assertOk()->assertJsonPath('analysis', null);

        $this->analyze();
        $this->actingAs($this->user)->getJson($this->sceneUrl('/analysis'))->assertJsonPath('analysis.stale', false);

        app(ScriptService::class)->save($this->scene, [['id' => '9', 'kind' => 'action', 'text' => 'Todo cambia.']], [$this->mara->id], null, $this->user->id);

        $this->actingAs($this->user)->getJson($this->sceneUrl('/analysis'))->assertJsonPath('analysis.stale', true);
        // Ver el último análisis nunca llama a la IA.
        Http::assertSentCount(1);
    }

    public function test_rate_limit_on_primary_uses_the_fallback_model(): void
    {
        Http::fakeSequence()
            ->push(['error' => ['message' => 'Rate limit reached']], 429)
            ->push($this->completion($this->aiResult()));

        $this->analyze()->assertOk()->assertJsonPath('analysis.model', 'fallback-model')->assertJsonPath('analysis.degraded', false);
        $this->assertSame('fallback', AiGeneration::sole()->status);
    }

    public function test_when_both_models_fail_it_degrades_to_keywords_and_retries_later(): void
    {
        Http::fake([self::URL => Http::response(['error' => ['message' => 'down']], 503)]);

        $this->analyze()
            ->assertOk()
            ->assertJsonPath('analysis.degraded', true)
            ->assertJsonPath('analysis.source', 'keywords')
            ->assertJsonCount(0, 'analysis.characters');

        $this->assertSame('degraded', AiGeneration::sole()->status);
        $this->assertTrue(EmotionalAnalysis::sole()->degraded);

        // Un análisis degradado no se reutiliza: se vuelve a intentar con la IA.
        $this->analyze()->assertOk();
        Http::assertSentCount(4);
    }

    public function test_invalid_ai_payload_degrades(): void
    {
        Http::fake([self::URL => Http::response($this->completion(['characters' => []]))]);

        $this->analyze()->assertOk()->assertJsonPath('analysis.degraded', true);
    }

    public function test_keywords_driver_never_calls_groq(): void
    {
        config(['gamerdust.ai.driver' => 'keywords']);
        Http::fake();

        $this->analyze()->assertOk()->assertJsonPath('analysis.source', 'keywords')->assertJsonPath('analysis.degraded', false);
        Http::assertNothingSent();
    }

    public function test_previous_ai_state_and_previous_scene_feed_the_next_scene(): void
    {
        Http::fake([self::URL => Http::response($this->completion($this->aiResult()))]);
        $this->analyze();

        $next = $this->writeScene('El regreso', [['id' => '1', 'kind' => 'action', 'text' => 'Mara vuelve al faro.']], [$this->mara->id], null);
        $this->actingAs($this->user)->postJson("/projects/{$this->project->id}/script/scenes/{$next->id}/analyze")->assertOk();

        Http::assertSent(fn (Request $request) => str_contains($request['messages'][1]['content'], 'ESCENA E02')
            && str_contains($request['messages'][1]['content'], 'fear (v=0.10, a=0.85, d=0.15) · origen: ai en E01')
            && str_contains($request['messages'][1]['content'], 'ESCENA ANTERIOR: E01 "La huida": fear'));
    }

    public function test_empty_scene_is_rejected_without_calling_the_ai(): void
    {
        Http::fake();
        $empty = $this->writeScene('Vacía', [['id' => '1', 'kind' => 'action', 'text' => '  ']], [], null);

        $this->actingAs($this->user)
            ->postJson("/projects/{$this->project->id}/script/scenes/{$empty->id}/analyze")
            ->assertStatus(422)
            ->assertJsonPath('message', __('There is not enough text to analyze.'));

        Http::assertNothingSent();
    }

    public function test_foreign_project_is_forbidden_and_foreign_scene_not_found(): void
    {
        Http::fake();
        $intruder = User::factory()->create();

        $this->actingAs($intruder)->postJson($this->sceneUrl('/analyze'))->assertForbidden();
        $this->actingAs($intruder)->getJson($this->sceneUrl('/analysis'))->assertForbidden();

        $other = $this->user->projects()->create(['title' => 'Otro', 'game_genre' => 'RPG', 'language' => 'es', 'narrative_type' => 'linear']);
        $this->actingAs($this->user)->postJson("/projects/{$other->id}/script/scenes/{$this->scene->id}/analyze")->assertNotFound();
        $this->actingAs($this->user)->getJson("/projects/{$other->id}/script/scenes/{$this->scene->id}/analysis")->assertNotFound();

        Http::assertNothingSent();
    }

    public function test_ai_calls_are_rate_limited_per_user(): void
    {
        config(['gamerdust.ai.rate_limit_per_minute' => 1]);
        Http::fake([self::URL => Http::response($this->completion($this->aiResult()))]);

        $this->analyze()->assertOk();
        $this->analyze(['force' => true])->assertStatus(429);
        Http::assertSentCount(1);
    }

    public function test_script_page_receives_the_emotion_catalog(): void
    {
        $this->actingAs($this->user)
            ->get("/projects/{$this->project->id}/script")
            ->assertInertia(fn ($page) => $page->where('emotionCatalog.emotions.fear.color', config('gamerdust.emotion.emotions.fear.color')));
    }

    private function analyze(array $body = [])
    {
        return $this->actingAs($this->user)->postJson($this->sceneUrl('/analyze'), $body);
    }

    private function sceneUrl(string $path): string
    {
        return "/projects/{$this->project->id}/script/scenes/{$this->scene->id}{$path}";
    }

    private function writeScene(string $title, array $script, array $characters, ?int $location): Scene
    {
        $service = app(ScriptService::class);
        $scene = $service->createScene($this->project, $title, 'Acto I', $this->user->id);

        return $service->save($scene, $script, $characters, $location, $this->user->id);
    }

    private function aiResult(): array
    {
        $state = fn (Character $character, array $vad, string $emotion, string $evidence) => [
            'character_id' => $character->id, 'name' => $character->name, ...$vad, 'emotion' => $emotion,
            'evidence' => $evidence, 'out_of_character' => false, 'out_of_character_reason' => '',
            'change_justified' => false, 'change_explanation' => 'Nada en la escena explica el giro.',
        ];

        return [
            'scene' => [
                'v' => 0.1, 'a' => 0.85, 'd' => 0.15, 'emotion' => 'fear',
                'summary' => 'Una huida nocturna cargada de miedo.', 'evidence' => 'suelta las amarras temblando',
                'change_justified' => true, 'change_explanation' => '',
            ],
            'characters' => [
                $state($this->mara, ['v' => 0.1, 'a' => 0.85, 'd' => 0.15], 'fear', 'No hay vuelta atrás.'),
                $state($this->iker, ['v' => 0.5, 'a' => 0.4, 'd' => 0.5], 'neutral', 'Íker observa.'),
                ['character_id' => 999] + $state($this->iker, ['v' => 0.5, 'a' => 0.5, 'd' => 0.5], 'neutral', 'x'),
            ],
            'inconsistencies' => [[
                'fragment' => 'suelta las amarras', 'contradicts' => 'Nadie navega de noche',
                'explanation' => 'Zarpa de noche sin consecuencia.', 'severity' => 'high',
            ]],
            'suggestions' => [['kind' => 'emotion', 'text' => 'Muestra el miedo en un gesto.', 'why' => 'Refuerza la tensión.']],
        ];
    }

    private function completion(array $content): array
    {
        return [
            'choices' => [['message' => ['role' => 'assistant', 'content' => json_encode($content)], 'finish_reason' => 'stop']],
            'usage' => ['prompt_tokens' => 900, 'completion_tokens' => 300, 'total_tokens' => 1200],
        ];
    }
}
