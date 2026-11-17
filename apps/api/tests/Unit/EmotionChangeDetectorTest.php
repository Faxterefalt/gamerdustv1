<?php

namespace Tests\Unit;

use App\Services\Emotion\EmotionChangeDetector;
use Tests\TestCase;

class EmotionChangeDetectorTest extends TestCase
{
    private EmotionChangeDetector $detector;

    protected function setUp(): void
    {
        parent::setUp();

        $this->detector = new EmotionChangeDetector;
    }

    public function test_threshold_is_exclusive(): void
    {
        $from = ['v' => 0.5, 'a' => 0.5, 'd' => 0.5];

        $below = $this->detector->compare($from, ['v' => 0.11, 'a' => 0.5, 'd' => 0.5]);
        $equal = $this->detector->compare($from, ['v' => 0.1, 'a' => 0.5, 'd' => 0.5]);
        $above = $this->detector->compare($from, ['v' => 0.5, 'a' => 0.91, 'd' => 0.5]);

        $this->assertSame([0.39, false, null], [$below['delta'], $below['abrupt'], $below['alert']]);
        $this->assertSame([0.4, false, null], [$equal['delta'], $equal['abrupt'], $equal['alert']]);
        $this->assertSame([0.41, true, EmotionChangeDetector::RED], [$above['delta'], $above['abrupt'], $above['alert']]);
    }

    public function test_the_rule_decides_and_the_ai_only_explains(): void
    {
        $from = ['v' => 0.8, 'a' => 0.3, 'd' => 0.6];
        $abrupt = ['v' => 0.1, 'a' => 0.9, 'd' => 0.2];
        $soft = ['v' => 0.7, 'a' => 0.4, 'd' => 0.6];

        $this->assertSame(EmotionChangeDetector::RED, $this->detector->compare($from, $abrupt, false)['alert']);
        $this->assertSame(EmotionChangeDetector::AMBER, $this->detector->compare($from, $abrupt, true)['alert']);
        // Sin explicación de la IA cuenta como no justificado.
        $this->assertSame(EmotionChangeDetector::RED, $this->detector->compare($from, $abrupt, null)['alert']);
        $this->assertNull($this->detector->compare($from, $soft, false)['alert']);
        $this->assertNull($this->detector->compare($from, $soft, true)['alert']);
    }

    public function test_without_previous_state_there_is_no_change(): void
    {
        $this->assertSame(['delta' => 0.0, 'abrupt' => false, 'alert' => null], $this->detector->compare(null, ['v' => 0.1, 'a' => 0.9, 'd' => 0.1], false));
    }

    public function test_threshold_comes_from_config(): void
    {
        config(['gamerdust.emotion.abrupt_threshold' => 0.2]);

        $this->assertTrue($this->detector->compare(['v' => 0.5, 'a' => 0.5, 'd' => 0.5], ['v' => 0.5, 'a' => 0.75, 'd' => 0.5])['abrupt']);
    }
}
