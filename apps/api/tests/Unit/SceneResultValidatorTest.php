<?php

namespace Tests\Unit;

use App\Services\Emotion\EmotionTranslator;
use App\Services\Emotion\SceneResultValidator;
use Tests\TestCase;

class SceneResultValidatorTest extends TestCase
{
    private SceneResultValidator $validator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->validator = new SceneResultValidator(new EmotionTranslator);
    }

    public function test_clamps_values_and_fixes_unknown_emotions(): void
    {
        $result = $this->validator->validate([
            'scene' => ['v' => -0.4, 'a' => 1.7, 'd' => 'x', 'emotion' => 'rage', 'summary' => ' Breve. ', 'evidence' => 'hola'],
        ], []);

        $this->assertSame(0.0, $result['scene']['v']);
        $this->assertSame(1.0, $result['scene']['a']);
        $this->assertSame(0.5, $result['scene']['d']);
        // "rage" no está en la lista: se usa la emoción más cercana a (0, 1, 0.5).
        $this->assertSame((new EmotionTranslator)->nearestEmotion(0.0, 1.0, 0.5), $result['scene']['emotion']);
        $this->assertSame('Breve.', $result['scene']['summary']);
        $this->assertNull($result['scene']['change_justified']);
    }

    public function test_drops_characters_outside_the_scene_and_duplicates(): void
    {
        $character = fn (mixed $id) => ['character_id' => $id, 'name' => 'X', 'v' => 0.5, 'a' => 0.5, 'd' => 0.5, 'emotion' => 'calm', 'evidence' => str_repeat('palabra ', 40)];

        $result = $this->validator->validate([
            'scene' => ['v' => 0.5, 'a' => 0.5, 'd' => 0.5, 'emotion' => 'neutral'],
            'characters' => [$character(3), $character(99), $character(3), $character('4'), 'basura'],
        ], [3, 4]);

        $this->assertSame([3, 4], array_column($result['characters'], 'character_id'));
        $this->assertLessThanOrEqual(SceneResultValidator::EVIDENCE_LIMIT + 1, mb_strlen($result['characters'][0]['evidence']));
        $this->assertStringEndsWith('…', $result['characters'][0]['evidence']);
        $this->assertFalse($result['characters'][0]['out_of_character']);
    }

    public function test_limits_suggestions_and_normalizes_enums(): void
    {
        $result = $this->validator->validate([
            'scene' => ['v' => 0.5, 'a' => 0.5, 'd' => 0.5, 'emotion' => 'neutral'],
            'suggestions' => array_fill(0, 5, ['kind' => 'magic', 'text' => 'Algo', 'why' => '']) + [1 => ['kind' => 'pacing', 'text' => '', 'why' => '']],
            'inconsistencies' => [['fragment' => 'f', 'contradicts' => 'Regla', 'explanation' => 'e', 'severity' => 'critical']],
        ], []);

        $this->assertCount(3, $result['suggestions']);
        $this->assertSame('emotion', $result['suggestions'][0]['kind']);
        $this->assertSame('medium', $result['inconsistencies'][0]['severity']);
    }

    public function test_missing_scene_is_unusable(): void
    {
        $this->assertNull($this->validator->validate(['characters' => []], []));
    }
}
