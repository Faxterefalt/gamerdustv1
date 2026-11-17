<?php

namespace Tests\Unit;

use App\Models\Scene;
use App\Services\Script\ScenePlainText;
use PHPUnit\Framework\TestCase;

class ScenePlainTextTest extends TestCase
{
    public function test_keeps_who_speaks_each_line(): void
    {
        $scene = new Scene;
        $scene->script = [
            ['id' => '1', 'kind' => 'heading', 'text' => 'ext. puerto - noche'],
            ['id' => '2', 'kind' => 'action', 'text' => 'Mara mira el mar.'],
            ['id' => '3', 'kind' => 'character', 'text' => 'Mara'],
            ['id' => '4', 'kind' => 'parenthetical', 'text' => '(en voz baja)'],
            ['id' => '5', 'kind' => 'dialogue', 'text' => 'No vuelvas.'],
            ['id' => '6', 'kind' => 'dialogue', 'text' => 'Nunca.'],
            ['id' => '7', 'kind' => 'action', 'text' => ''],
            ['id' => '8', 'kind' => 'character', 'text' => 'Íker'],
            ['id' => '9', 'kind' => 'parenthetical', 'text' => 'se va'],
        ];

        $this->assertSame(
            "EXT. PUERTO - NOCHE\nMara mira el mar.\nMARA (en voz baja): No vuelvas.\nMARA: Nunca.\nÍKER (se va)",
            (new ScenePlainText)->build($scene),
        );
    }

    public function test_empty_script_gives_empty_text(): void
    {
        $this->assertSame('', (new ScenePlainText)->build(new Scene));
        $this->assertSame(['a b', false], (new ScenePlainText)->limit('a b', 5));
    }
}
