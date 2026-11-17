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

    public function test_sin_clave_el_contenedor_usa_el_analizador_por_palabras_clave(): void
    {
        $this->assertInstanceOf(KeywordEmotionAnalyzer::class, app(EmotionAnalyzer::class));
    }

    public function test_convierte_el_analisis_simulado_a_la_escala_de_0_a_1(): void
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

    public function test_la_emocion_antigua_tension_se_traduce_a_ansiedad(): void
    {
        $scene = $this->scene([
            ['id' => '1', 'kind' => 'action', 'text' => 'Un conflicto, un riesgo y un secreto.'],
        ]);

        $this->assertSame('anxiety', app(EmotionAnalyzer::class)->analyzeScene($scene)->scene['emotion']);
    }

    public function test_las_escenas_largas_se_recortan(): void
    {
        config(['gamerdust.ai.max_scene_words' => 5]);
        $scene = $this->scene([
            ['id' => '1', 'kind' => 'action', 'text' => 'uno dos tres'],
            ['id' => '2', 'kind' => 'action', 'text' => 'cuatro cinco seis siete'],
        ]);

        $this->assertTrue(app(EmotionAnalyzer::class)->analyzeScene($scene)->truncated);
        $this->assertSame(["uno dos tres\ncuatro cinco …", true], app(ScenePlainText::class)->limit("uno dos tres\ncuatro cinco seis siete", 5));
    }

    public function test_la_copia_degradada_conserva_el_resultado(): void
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
