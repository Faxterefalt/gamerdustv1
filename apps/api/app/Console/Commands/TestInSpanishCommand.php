<?php

namespace App\Console\Commands;

use Dotenv\Parser\Entry;
use Dotenv\Parser\Parser;
use Illuminate\Console\Command;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Terminal;
use Symfony\Component\Process\Process;

/**
 * Ejecuta `php artisan test` y muestra el resultado en español.
 *
 * Collision (el formato de `artisan test`) tiene sus etiquetas fijas en inglés (PASS, Tests:, passed...),
 * así que este comando lanza la suite en un subproceso y traduce esas etiquetas línea a línea.
 * Las descripciones de cada prueba ya salen en español porque los métodos test_* están nombrados en español.
 * Los mensajes internos de PHPUnit al fallar una comprobación pueden quedar en parte en inglés.
 *
 * Fuerza APP_LOCALE=es (varios tests esperan textos en español). Acepta las mismas opciones que `artisan test`:
 *
 *   php artisan gamerdust:test
 *   php artisan gamerdust:test --filter=CumbreMudaSeederTest
 */
class TestInSpanishCommand extends Command
{
    protected $signature = 'gamerdust:test';

    protected $description = 'Ejecuta las pruebas y muestra el resultado en español (acepta las opciones de artisan test)';

    /** Etiquetas de Collision → español. Se aplican en orden y solo sobre las etiquetas, no sobre el texto de las pruebas. */
    private const REPLACEMENTS = [
        // Cabecera de cada clase y de cada fallo (palabras sueltas en mayúsculas).
        '/(?<![\w\\\\])PASS(?!\w)/' => 'PASA',
        '/(?<![\w\\\\])FAILED(?!\w)/' => 'FALLIDA',
        '/(?<![\w\\\\])FAIL(?!\w)/' => 'FALLA',
        '/(?<![\w\\\\])WARNINGS(?!\w)/' => 'AVISOS',
        '/(?<![\w\\\\])WARN(?!\w)/' => 'AVISO',
        '/(?<![\w\\\\])RISKY(?!\w)/' => 'ARRIESGADA',
        '/(?<![\w\\\\])SKIPPED(?!\w)/' => 'OMITIDA',
        '/(?<![\w\\\\])INCOMPLETE(?!\w)/' => 'INCOMPLETA',
        '/(?<![\w\\\\])DEPRECATED(?!\w)/' => 'OBSOLETA',
        '/(?<![\w\\\\])NOTI(?!\w)/' => 'NOTA',
        '/(?<![\w\\\\])DEPR(?!\w)/' => 'OBSOL',
        '/(?<![\w\\\\])TODO(?!\w)/' => 'PEND',
        // Resumen final: "117 passed, 2 failed (746 assertions)".
        '/(\d+) passed\b/' => '$1 pasadas',
        '/(\d+) failed\b/' => '$1 fallidas',
        '/(\d+) skipped\b/' => '$1 omitidas',
        '/(\d+) incomplete\b/' => '$1 incompletas',
        '/(\d+) risky\b/' => '$1 arriesgadas',
        '/(\d+) warnings?\b/' => '$1 con avisos',
        '/(\d+) deprecated\b/' => '$1 con código obsoleto',
        '/(\d+) notices?\b/' => '$1 con notas',
        '/(\d+) todos?\b/' => '$1 pendientes',
        '/(\d+) pending\b/' => '$1 sin ejecutar',
        '/(\d+) assertions\b/' => '$1 comprobaciones',
        // Sin \b inicial: suelen ir justo detrás de un código de color ANSI (que termina en "m").
        '/Tests:/' => 'Pruebas:',
        '/Duration:/' => 'Duración:',
        '/Random Order Seed:/' => 'Semilla del orden aleatorio:',
        '/Top (\d+) slowest tests:/' => 'Las $1 pruebas más lentas:',
        '/No tests found\./' => 'No se encontró ninguna prueba.',
        '/No tests executed!/' => '¡No se ejecutó ninguna prueba!',
        // Mensajes habituales de PHPUnit al fallar.
        '/Failed asserting that\b/' => 'Falló la comprobación de que',
        '/Expected response status code\b/' => 'Se esperaba el código de estado',
        '/\bbut received\b/' => 'pero se recibió',
        '/\bis identical to\b/' => 'es idéntico a',
        '/\bmatches expected\b/' => 'coincide con el esperado',
        '/\bis true\b/' => 'es verdadero',
        '/\bis false\b/' => 'es falso',
        '/\bis null\b/' => 'es null',
        // "at tests\Unit\X.php:8" (la ruta va en verde: puede haber un código de color antes de "tests").
        '/\bat ((?:\e\[[0-9;]*m)*tests[\\\\\/])/' => 'en $1',
    ];

    public function __construct()
    {
        parent::__construct();

        // Las opciones se reenvían tal cual a `artisan test`.
        $this->ignoreValidationErrors();
    }

    public function handle(): int
    {
        $process = new Process(
            [PHP_BINARY, 'artisan', 'test', '--ansi', ...$this->forwardedArguments()],
            base_path(),
            [
                // Este proceso ya cargó el .env (APP_ENV=local...): no se hereda, o pisaría el APP_ENV=testing de phpunit.xml.
                ...array_fill_keys($this->dotenvNames(), false),
                'APP_LOCALE' => 'es',
                // Collision dibuja según el ancho de la terminal; en un subproceso hay que pasárselo.
                'COLUMNS' => (string) (new Terminal)->getWidth(),
            ],
            null,
            null,
        );

        $buffer = '';
        $process->run(function (string $type, string $chunk) use (&$buffer) {
            $buffer .= $chunk;
            // Se traduce por líneas completas para no partir una palabra entre dos fragmentos.
            while (($position = strpos($buffer, "\n")) !== false) {
                $this->writeRaw(self::translate(substr($buffer, 0, $position + 1)));
                $buffer = substr($buffer, $position + 1);
            }
        });

        if ($buffer !== '') {
            $this->writeRaw(self::translate($buffer));
        }

        return $process->getExitCode() ?? self::FAILURE;
    }

    /** Traduce las etiquetas de Collision de un fragmento de salida (puede llevar códigos de color ANSI). */
    public static function translate(string $text): string
    {
        return preg_replace(array_keys(self::REPLACEMENTS), array_values(self::REPLACEMENTS), $text) ?? $text;
    }

    /** @return list<string> argumentos escritos tras el nombre del comando */
    private function forwardedArguments(): array
    {
        $argv = $_SERVER['argv'] ?? [];
        $position = array_search($this->getName(), $argv, true);

        return $position === false ? [] : array_values(array_slice($argv, $position + 1));
    }

    /** @return list<string> nombres de las variables definidas en el .env */
    private function dotenvNames(): array
    {
        $file = $this->laravel->environmentFilePath();

        if (! is_file($file)) {
            return [];
        }

        return array_map(fn (Entry $entry) => $entry->getName(), (new Parser)->parse((string) file_get_contents($file)));
    }

    private function writeRaw(string $text): void
    {
        $this->output->getOutput()->write($text, false, OutputInterface::OUTPUT_RAW);
    }
}
