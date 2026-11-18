<?php

namespace Tests\Unit;

use App\Services\Branching\BranchingStateEvaluator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Los casos de tests/Fixtures/branching-state-cases.json describen el comportamiento que debe
 * compartir el espejo en JavaScript (reports/partials/branching-state.blade.php).
 */
class BranchingStateEvaluatorTest extends TestCase
{
    public static function cases(): array
    {
        $cases = json_decode(file_get_contents(__DIR__.'/../Fixtures/branching-state-cases.json'), true, flags: JSON_THROW_ON_ERROR);

        return array_combine(array_column($cases, 'name'), array_map(fn (array $case) => [$case], $cases));
    }

    #[DataProvider('cases')]
    public function test_aplica_efectos_y_evalua_condiciones_como_el_reproductor(array $case): void
    {
        $evaluator = new BranchingStateEvaluator;

        $state = $evaluator->apply($case['effects'], $evaluator->initialState($case['variables']));

        $this->assertEquals($case['state'], $state);
        $this->assertSame($case['available'], $evaluator->isAvailable($case['condition'], $state));
    }

    public function test_aplicar_no_modifica_el_estado_recibido(): void
    {
        $evaluator = new BranchingStateEvaluator;
        $state = ['confianza' => 0];

        $next = $evaluator->apply([['var' => 'confianza', 'op' => 'add', 'value' => 1]], $state);

        $this->assertSame(['confianza' => 0], $state);
        $this->assertSame(['confianza' => 1], $next);
    }

    public function test_los_efectos_se_aplican_en_orden(): void
    {
        $evaluator = new BranchingStateEvaluator;

        $state = $evaluator->apply([
            ['var' => 'n', 'op' => 'set', 'value' => 10],
            ['var' => 'n', 'op' => 'sub', 'value' => 4],
            ['var' => 'n', 'op' => 'add', 'value' => 0.5],
        ], ['n' => 0]);

        $this->assertSame(['n' => 6.5], $state);
    }

    public function test_los_enteros_se_conservan_como_enteros(): void
    {
        $evaluator = new BranchingStateEvaluator;

        $this->assertSame(['n' => 3], $evaluator->apply([['var' => 'n', 'op' => 'add', 'value' => 1.0]], ['n' => 2]));
        $this->assertSame(3, $evaluator->coerce('number', 3.0));
        $this->assertNull($evaluator->coerce('number', INF));
        $this->assertNull($evaluator->coerce('bool', 1));
    }
}
