<?php

namespace Tests\Unit;

use App\Console\Commands\TestInSpanishCommand;
use PHPUnit\Framework\TestCase;

class TestInSpanishTranslationTest extends TestCase
{
    public function test_traduce_las_cabeceras_y_el_resumen(): void
    {
        $this->assertSame('  PASA  Tests\Unit\ExampleTest', TestInSpanishCommand::translate('  PASS  Tests\Unit\ExampleTest'));
        $this->assertSame('  FALLA  Tests\Feature\X', TestInSpanishCommand::translate('  FAIL  Tests\Feature\X'));
        $this->assertSame(
            '  Pruebas:    2 fallidas, 115 pasadas (746 comprobaciones)',
            TestInSpanishCommand::translate('  Tests:    2 failed, 115 passed (746 assertions)'),
        );
        $this->assertSame('  Duración: 8.49s', TestInSpanishCommand::translate('  Duration: 8.49s'));
    }

    public function test_traduce_el_mensaje_de_un_fallo(): void
    {
        $this->assertSame(
            '  Falló la comprobación de que 4 es idéntico a 5.',
            TestInSpanishCommand::translate('  Failed asserting that 4 is identical to 5.'),
        );
        $this->assertSame(
            "  en \e[32mtests\\Unit\\X.php\e[39m:8",
            TestInSpanishCommand::translate("  at \e[32mtests\\Unit\\X.php\e[39m:8"),
        );
    }

    public function test_conserva_los_codigos_de_color(): void
    {
        $this->assertSame(
            "\e[32;1m117 pasadas\e[39;22m\e[90m (746 comprobaciones)\e[39m",
            TestInSpanishCommand::translate("\e[32;1m117 passed\e[39;22m\e[90m (746 assertions)\e[39m"),
        );
        $this->assertSame("  \e[90mPruebas:\e[39m", TestInSpanishCommand::translate("  \e[90mTests:\e[39m"));
        $this->assertSame("  \e[90mDuración:\e[39m 6.82s", TestInSpanishCommand::translate("  \e[90mDuration:\e[39m 6.82s"));
    }

    public function test_no_toca_las_descripciones_de_las_pruebas(): void
    {
        $line = '  ✓ la regla decide y la ia solo explica                0.02s';

        $this->assertSame($line, TestInSpanishCommand::translate($line));
    }
}
