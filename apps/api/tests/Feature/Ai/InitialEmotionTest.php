<?php

namespace Tests\Feature\Ai;

use App\Models\CharacterEmotionalState;
use App\Models\EmotionalAnalysis;
use App\Models\Project;
use App\Models\Scene;
use App\Models\User;
use App\Services\Emotion\EmotionalAnalysisService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InitialEmotionTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->project = $this->user->projects()->create(['title' => 'Faro', 'game_genre' => 'RPG', 'language' => 'es', 'narrative_type' => 'linear']);
    }

    public function test_sheet_saves_initial_emotion_and_page_receives_the_catalog(): void
    {
        $this->actingAs($this->user)
            ->post("/projects/{$this->project->id}/characters", [
                'name' => 'Mara',
                'initial_emotion' => 'hope',
                'initial_intensity' => 'high',
            ])
            ->assertSessionHasNoErrors();

        $mara = $this->project->characters()->sole();
        $this->assertSame(['hope', 'high'], [$mara->initial_emotion, $mara->initial_intensity]);

        $this->actingAs($this->user)
            ->get("/projects/{$this->project->id}/characters?character={$mara->id}")
            ->assertInertia(fn ($page) => $page
                ->where('entries.0.initial_emotion', 'hope')
                ->where('entries.0.initial_intensity', 'high')
                ->where('emotionCatalog.emotions.hope.color', config('gamerdust.emotion.emotions.hope.color'))
                ->where('emotionCatalog.intensities', ['low', 'medium', 'high'])
                ->missing('emotionCatalog.emotions.hope.v'));
    }

    public function test_multipart_update_clears_intensity_without_emotion(): void
    {
        $mara = $this->project->characters()->create(['name' => 'Mara', 'initial_emotion' => 'fear', 'initial_intensity' => 'low']);

        // Como la ficha: POST + _method=put, con los vacíos convertidos a null.
        $this->actingAs($this->user)
            ->post("/projects/{$this->project->id}/characters/{$mara->id}", [
                '_method' => 'put',
                'name' => 'Mara',
                'initial_emotion' => '',
                'initial_intensity' => 'low',
                'sync_scenes' => '1',
            ])
            ->assertSessionHasNoErrors();

        $this->assertNull($mara->refresh()->initial_emotion);
        $this->assertNull($mara->initial_intensity);
    }

    public function test_rejects_unknown_emotion_and_intensity(): void
    {
        app()->setLocale('es');

        $this->actingAs($this->user)
            ->post("/projects/{$this->project->id}/characters", [
                'name' => 'Mara',
                'initial_emotion' => 'tension',
                'initial_intensity' => 'extreme',
            ])
            ->assertSessionHasErrors(['initial_emotion', 'initial_intensity']);

        $this->assertSame(0, $this->project->characters()->count());
        $this->assertStringContainsString('emoción inicial', session('errors')->first('initial_emotion'));
    }

    public function test_emotional_states_are_unique_per_scene_and_cascade(): void
    {
        $mara = $this->project->characters()->create(['name' => 'Mara']);
        $scene = $this->project->scenes()->create(['title' => 'Puerto', 'order' => 1]);
        $analysis = $this->project->emotionalAnalyses()->create([
            'analyzable_type' => Scene::class,
            'analyzable_id' => $scene->id,
            'input_text' => 'x',
            'dominant_emotion' => 'fear',
            'source' => 'groq',
            'content_hash' => str_repeat('a', 64),
            'result' => ['scene' => ['emotion' => 'fear']],
        ]);

        $state = CharacterEmotionalState::create([
            'project_id' => $this->project->id,
            'character_id' => $mara->id,
            'scene_id' => $scene->id,
            'emotional_analysis_id' => $analysis->id,
            'v' => 0.1, 'a' => 0.85, 'd' => 0.15,
            'emotion' => 'fear',
            'change_justified' => null,
        ]);

        $this->assertSame(['v' => 0.1, 'a' => 0.85, 'd' => 0.15], $state->fresh()->vad());
        $this->assertSame(['scene' => ['emotion' => 'fear']], $analysis->fresh()->result);
        $this->assertFalse($analysis->fresh()->degraded);
        $this->assertCount(1, $mara->emotionalStates);

        $mara->delete();
        $this->assertSame(0, CharacterEmotionalState::count());
    }

    public function test_legacy_keyword_analysis_still_saves_without_new_fields(): void
    {
        $scene = $this->project->scenes()->create(['title' => 'Puerto', 'order' => 1]);

        $analysis = app(EmotionalAnalysisService::class)->createFor($this->project, $scene, 'miedo y terror');

        $this->assertNull($analysis->fresh()->source);
        $this->assertNull($analysis->fresh()->content_hash);
        $this->assertSame(1, EmotionalAnalysis::count());
    }
}
