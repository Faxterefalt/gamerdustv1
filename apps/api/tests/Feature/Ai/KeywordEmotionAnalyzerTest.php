<?php

namespace Tests\Feature\Ai;

use App\Contracts\EmotionAnalyzer;
use App\Models\Scene;
use App\Models\User;
use App\Services\Emotion\KeywordEmotionAnalyzer;
use App\Services\Script\ScenePlainText;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KeywordEmotionAnalyzerTest extends TestCase
{
    use RefreshDatabase;

    public function test_container_resolves_the_keyword_analyzer_without_a_key(): void
    {
        $this->assertInstanceOf(KeywordEmotionAnalyzer::class, app(EmotionAnalyzer::class));
    }

    public function test_converts_the_simulated_analysis_to_the_unit_scale(): void
    {
        $scene = $this->scene([
            ['id' => '1', 'kind' => 'action', 'text' => 'El miedo y el terror llenan el puerto.'],
        ]);

        $result = app(EmotionAnalyzer::class)->analyzeScene($scene);

        $this->assertSame('keywords', $result->source);
        $this->assertSame('fear', $result->scene['emotion']);
        // Valencia antigua -0.55 → (−0.55 + 1) / 2.
        $this->assertSame(0.225, $result->scene['v']);
        $this->assertSame(0.35, $result->scene['d']);
        $this->assertFalse($result->degraded);
        $this->assertNotEmpty($result->suggestions);
        $this->assertSame(['kind', 'text', 'why'], array_keys($result->suggestions[0]));
    }

    public function test_legacy_tension_maps_to_anxiety(): void
    {
        $scene = $this->scene([
            ['id' => '1', 'kind' => 'action', 'text' => 'Un conflicto, un riesgo y un secreto.'],
        ]);

        $this->assertSame('anxiety', app(EmotionAnalyzer::class)->analyzeScene($scene)->scene['emotion']);
    }

    public function test_long_scenes_are_truncated(): void
    {
        config(['gamerdust.ai.max_scene_words' => 5]);
        $scene = $this->scene([
            ['id' => '1', 'kind' => 'action', 'text' => 'uno dos tres'],
            ['id' => '2', 'kind' => 'action', 'text' => 'cuatro cinco seis siete'],
        ]);

        $this->assertTrue(app(EmotionAnalyzer::class)->analyzeScene($scene)->truncated);
        $this->assertSame(["uno dos tres\ncuatro cinco …", true], app(ScenePlainText::class)->limit("uno dos tres\ncuatro cinco seis siete", 5));
    }

    public function test_degraded_copy_keeps_the_result(): void
    {
        $result = KeywordEmotionAnalyzer::fromKeywords([
            'dominant_emotion' => 'joy', 'valence' => 0.75, 'arousal' => 0.5, 'dominance' => 0.6,
            'interpretation' => 'x', 'suggestions' => [],
        ])->asDegraded(7);

        $this->assertTrue($result->degraded);
        $this->assertSame(7, $result->aiGenerationId);
        $this->assertSame(0.875, $result->scene['v']);
        $this->assertTrue($result->toArray()['degraded']);
    }

    private function scene(array $script): Scene
    {
        $user = User::factory()->create();
        $project = $user->projects()->create(['title' => 'Faro', 'game_genre' => 'adventure']);

        return $project->scenes()->create(['title' => 'Puerto', 'order' => 1, 'script' => $script]);
    }
}
