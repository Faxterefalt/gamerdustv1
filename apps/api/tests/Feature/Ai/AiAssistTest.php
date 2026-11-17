<?php

namespace Tests\Feature\Ai;

use App\Models\AiFeedback;
use App\Models\AiGeneration;
use App\Models\Character;
use App\Models\EmotionalAnalysis;
use App\Models\Project;
use App\Models\Scene;
use App\Models\User;
use App\Services\Script\ScriptService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AiAssistTest extends TestCase
{
    use RefreshDatabase;

    private const URL = 'https://api.groq.com/openai/v1/chat/completions';

    private User $user;

    private Project $project;

    private Character $mara;

    private Scene $scene;

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.locale' => 'es', 'services.groq.key' => 'test-secret-key']);

        $this->user = User::factory()->create();
        $this->project = $this->user->projects()->create(['title' => 'Faro', 'game_genre' => 'Aventura', 'language' => 'es', 'narrative_type' => 'linear', 'premise' => 'Una farera guarda un secreto.']);
        $this->mara = $this->project->characters()->create(['name' => 'Mara', 'personality' => 'Valiente']);
        $this->project->loreEntries()->create(['title' => 'Nadie navega de noche', 'type' => 'rule', 'statement' => 'Prohibido zarpar de noche.']);

        $script = app(ScriptService::class);
        $scene = $script->createScene($this->project, 'La huida', 'Acto I', $this->user->id);
        $this->scene = $script->save($scene, [
            ['id' => 'b1', 'kind' => 'action', 'text' => 'Mara suelta las amarras.'],
            ['id' => 'b2', 'kind' => 'character', 'text' => 'Mara'],
            ['id' => 'b3', 'kind' => 'dialogue', 'text' => 'No hay vuelta atrás.'],
        ], [$this->mara->id], null, $this->user->id);
    }

    public function test_character_draft_fills_fields_without_saving(): void
    {
        Http::fake([self::URL => Http::response($this->completion([
            'name' => 'Íker', 'role' => 'Aliado', 'archetype' => 'Pícaro', 'age' => 230, 'gender' => '',
            'background' => 'Contrabandista retirado.', 'personality' => 'Burlón y leal', 'speech_style' => 'Frases cortas',
            'motivation' => 'Salir del pueblo', 'fear' => 'El mar de noche', 'desire' => '', 'emotional_arc' => '',
            'visual_description' => '', 'voice_notes' => '', 'limits' => '',
            'initial_emotion' => 'anxiety', 'initial_intensity' => 'high',
        ]))]);

        $response = $this->actingAs($this->user)
            ->postJson("/projects/{$this->project->id}/ai/character-draft", ['idea' => 'Un contrabandista retirado que teme al mar'])
            ->assertOk()
            ->assertJsonPath('draft.name', 'Íker')
            ->assertJsonPath('draft.personality', 'Burlón y leal')
            // Edad fuera de rango → sin edad.
            ->assertJsonPath('draft.age', null)
            ->assertJsonPath('draft.initial_emotion', 'anxiety')
            ->assertJsonPath('duplicate_name', false);

        // Nada se guarda: solo el registro de la llamada.
        $this->assertSame(1, $this->project->characters()->count());
        $generation = AiGeneration::sole();
        $this->assertSame(['character_draft', 'ok'], [$generation->generation_type, $generation->status]);
        $this->assertSame($generation->id, $response->json('generation_id'));

        Http::assertSent(fn (Request $request) => str_contains($request['messages'][1]['content'], 'PERSONAJES EXISTENTES: Mara')
            && str_contains($request['messages'][1]['content'], '"Nadie navega de noche"')
            && str_contains($request['messages'][1]['content'], 'IDEA DEL AUTOR: Un contrabandista retirado que teme al mar')
            && $request['response_format']['json_schema']['schema']['properties']['age']['type'] === ['integer', 'null']);
    }

    public function test_character_draft_flags_an_existing_name_and_fails_kindly(): void
    {
        Http::fakeSequence()
            ->push($this->completion(['name' => ' mara ', 'initial_emotion' => 'rage']))
            ->push(['error' => ['message' => 'down']], 500)
            ->push(['error' => ['message' => 'down']], 500);

        $this->actingAs($this->user)
            ->postJson("/projects/{$this->project->id}/ai/character-draft", ['idea' => 'Otra Mara'])
            ->assertOk()
            ->assertJsonPath('duplicate_name', true)
            ->assertJsonPath('draft.initial_emotion', null)
            ->assertJsonPath('draft.initial_intensity', null);

        // Sin degradación: mensaje amable.
        $this->actingAs($this->user)
            ->postJson("/projects/{$this->project->id}/ai/character-draft", ['idea' => 'Otra idea'])
            ->assertStatus(503)
            ->assertJsonPath('message', __('AI is busy, try again in a minute'));

        $this->actingAs($this->user)->postJson("/projects/{$this->project->id}/ai/character-draft", [])->assertUnprocessable()->assertJsonValidationErrors('idea');
        $this->actingAs(User::factory()->create())->postJson("/projects/{$this->project->id}/ai/character-draft", ['idea' => 'Hola'])->assertForbidden();
    }

    public function test_refine_proposes_text_without_touching_the_scene(): void
    {
        Http::fake([self::URL => Http::response($this->completion([
            'proposal' => 'Ya no hay vuelta atrás, y lo sabes.',
            'changes' => ['Más urgencia en la frase.', '', 'Apela a Íker.'],
            'resulting_emotion' => 'rage',
        ]))]);

        $before = [$this->scene->fresh()->script, $this->scene->fresh()->updated_at->toJSON(), $this->scene->versions()->count()];

        $response = $this->actingAs($this->user)
            ->postJson($this->refineUrl(), [
                // Texto del borrador local, aún sin guardar.
                'block' => ['id' => 'b3', 'kind' => 'dialogue', 'text' => 'No hay vuelta atrás, de verdad.'],
                'goal' => 'true_to_character',
                'character_id' => $this->mara->id,
                'instruction' => 'Que suene desafiante',
            ])
            ->assertOk()
            ->assertJsonPath('proposal', 'Ya no hay vuelta atrás, y lo sabes.')
            ->assertJsonPath('changes', ['Más urgencia en la frase.', 'Apela a Íker.'])
            // Emoción fuera de la lista → neutral.
            ->assertJsonPath('resulting_emotion', 'neutral');

        $this->assertSame($before, [$this->scene->fresh()->script, $this->scene->fresh()->updated_at->toJSON(), $this->scene->versions()->count()]);
        $this->assertSame('refine', AiGeneration::sole()->generation_type);
        $this->assertNotNull($response->json('generation_id'));

        Http::assertSent(fn (Request $request) => str_contains($request['messages'][0]['content'], 'fiel a la personalidad de Mara')
            && str_contains($request['messages'][0]['content'], 'Que suene desafiante')
            && str_contains($request['messages'][1]['content'], 'BLOQUE A REFINAR (diálogo, lo dice Mara):')
            && str_contains($request['messages'][1]['content'], 'No hay vuelta atrás, de verdad.')
            && str_contains($request['messages'][1]['content'], "[character_id:{$this->mara->id}] Mara"));
    }

    public function test_refine_validation_and_authorization(): void
    {
        Http::fake();
        $block = ['id' => 'b1', 'kind' => 'action', 'text' => 'Mara suelta las amarras.'];

        $this->actingAs($this->user)->postJson($this->refineUrl(), ['block' => $block, 'goal' => 'true_to_character'])
            ->assertUnprocessable()->assertJsonValidationErrors('character_id');

        $other = $this->user->projects()->create(['title' => 'Otro', 'game_genre' => 'RPG', 'language' => 'es', 'narrative_type' => 'linear']);
        $stranger = $other->characters()->create(['name' => 'Ajeno']);

        $this->actingAs($this->user)->postJson($this->refineUrl(), ['block' => $block, 'goal' => 'true_to_character', 'character_id' => $stranger->id])
            ->assertUnprocessable()->assertJsonValidationErrors('character_id');
        $this->actingAs($this->user)->postJson($this->refineUrl(), ['block' => $block, 'goal' => 'magic'])
            ->assertUnprocessable()->assertJsonValidationErrors('goal');
        $this->actingAs($this->user)->postJson("/projects/{$other->id}/script/scenes/{$this->scene->id}/refine", ['block' => $block, 'goal' => 'clearer'])
            ->assertNotFound();
        $this->actingAs(User::factory()->create())->postJson($this->refineUrl(), ['block' => $block, 'goal' => 'clearer'])
            ->assertForbidden();

        Http::assertNothingSent();
    }

    public function test_feedback_is_saved_once_per_item_and_shown_in_the_panel(): void
    {
        $analysis = $this->project->emotionalAnalyses()->create([
            'analyzable_type' => Scene::class, 'analyzable_id' => $this->scene->id, 'input_text' => 'x', 'dominant_emotion' => 'fear',
            'source' => 'groq', 'content_hash' => str_repeat('a', 64),
            'result' => ['scene' => ['v' => 0.1, 'a' => 0.8, 'd' => 0.2, 'emotion' => 'fear'], 'suggestions' => [['kind' => 'emotion', 'text' => 'A', 'why' => '']]],
        ]);
        $url = "/projects/{$this->project->id}/ai/feedback";

        $this->actingAs($this->user)->postJson($url, ['emotional_analysis_id' => $analysis->id, 'item_index' => 0, 'useful' => true])->assertOk();
        $this->actingAs($this->user)->postJson($url, ['emotional_analysis_id' => $analysis->id, 'item_index' => 0, 'useful' => false])->assertOk();

        $this->assertSame(1, AiFeedback::count());
        $this->assertFalse(AiFeedback::sole()->useful);

        $this->actingAs($this->user)
            ->getJson("/projects/{$this->project->id}/script/scenes/{$this->scene->id}/analysis")
            ->assertJsonPath('analysis.feedback.0', false);

        // Un análisis de otro proyecto no se puede valorar desde este.
        $other = $this->user->projects()->create(['title' => 'Otro', 'game_genre' => 'RPG', 'language' => 'es', 'narrative_type' => 'linear']);
        $foreign = EmotionalAnalysis::create(['project_id' => $other->id, 'input_text' => 'x', 'dominant_emotion' => 'joy']);
        $this->actingAs($this->user)->postJson($url, ['emotional_analysis_id' => $foreign->id, 'item_index' => 0, 'useful' => true])
            ->assertUnprocessable()->assertJsonValidationErrors('emotional_analysis_id');
        $this->actingAs($this->user)->postJson($url, ['item_index' => 0, 'useful' => true])->assertUnprocessable();
    }

    public function test_metrics_command_exports_a_csv(): void
    {
        AiGeneration::create(['project_id' => $this->project->id, 'user_id' => $this->user->id, 'generation_type' => 'scene_analysis', 'status' => 'ok', 'total_tokens' => 1000, 'latency_ms' => 2000]);
        AiGeneration::create(['project_id' => $this->project->id, 'user_id' => $this->user->id, 'generation_type' => 'scene_analysis', 'status' => 'degraded', 'latency_ms' => 9000]);
        $generation = AiGeneration::create(['project_id' => $this->project->id, 'user_id' => $this->user->id, 'generation_type' => 'refine', 'status' => 'fallback', 'total_tokens' => 400, 'latency_ms' => 1000]);
        AiFeedback::create(['project_id' => $this->project->id, 'user_id' => $this->user->id, 'ai_generation_id' => $generation->id, 'item_index' => 0, 'useful' => true]);

        $path = storage_path('framework/testing/ai-metrics-test.csv');
        @unlink($path);

        $this->artisan('gamerdust:ai-metrics', ['project' => $this->project->id, '--output' => $path])->assertSuccessful();

        $rows = array_map('str_getcsv', file($path, FILE_IGNORE_NEW_LINES));
        $this->assertSame(['metric', 'group', 'value'], $rows[0]);
        $this->assertContains(['ai_calls', 'scene_analysis:degraded', '1'], $rows);
        $this->assertContains(['avg_latency_ms', 'scene_analysis', '2000'], $rows);
        $this->assertContains(['failure_rate_pct', 'scene_analysis', '50'], $rows);
        $this->assertContains(['useful_pct', 'generations', '100'], $rows);
        $this->assertContains(['character_alerts', 'red', '0'], $rows);

        $this->artisan('gamerdust:ai-metrics', ['project' => 999])->assertFailed();
        @unlink($path);
    }

    private function refineUrl(): string
    {
        return "/projects/{$this->project->id}/script/scenes/{$this->scene->id}/refine";
    }

    private function completion(array $content): array
    {
        return [
            'choices' => [['message' => ['content' => json_encode($content)], 'finish_reason' => 'stop']],
            'usage' => ['prompt_tokens' => 100, 'completion_tokens' => 50, 'total_tokens' => 150],
        ];
    }
}
