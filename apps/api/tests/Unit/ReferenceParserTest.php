<?php

namespace Tests\Unit;

use App\Services\Branching\ReferenceParser;
use PHPUnit\Framework\TestCase;

class ReferenceParserTest extends TestCase
{
    private ReferenceParser $parser;

    protected function setUp(): void
    {
        $this->parser = new ReferenceParser();
    }

    public function test_extracts_complete_references_in_order(): void
    {
        $refs = $this->parser->extract('Ve al {{Bosque}} o al {{ Castillo }}.');

        $this->assertSame(['bosque', 'castillo'], array_column($refs, 'key'));
        $this->assertSame(['Bosque', 'Castillo'], array_column($refs, 'label'));
    }

    public function test_ignores_unclosed_empty_and_multiline_references(): void
    {
        $this->assertSame([], $this->parser->extract('Hola {{Busc'));
        $this->assertSame([], $this->parser->extract('Hola {{}} y {{   }}'));
        $this->assertSame([], $this->parser->extract("Hola {{Busc\nsin cerrar}}"));
        $this->assertSame([], $this->parser->extract(null));
    }

    public function test_normalizes_whitespace_and_case_and_deduplicates(): void
    {
        $refs = $this->parser->extract('{{Gran   Bosque}} {{ gran bosque }} {{GRAN BOSQUE}}');

        $this->assertCount(1, $refs);
        $this->assertSame('gran bosque', $refs[0]['key']);
        $this->assertSame('Gran Bosque', $refs[0]['label']);
    }

    public function test_numeric_like_keys_stay_strings(): void
    {
        $refs = $this->parser->extract('{{2024}} {{1e3}} {{1000}}');

        $this->assertSame(['2024', '1e3', '1000'], array_column($refs, 'key'));
    }

    public function test_replace_only_changes_matching_references(): void
    {
        $text = '{{ Bosque }} y {{Castillo}} y {{bosque}}';

        $this->assertSame('{{Selva}} y {{Castillo}} y {{Selva}}', $this->parser->replace($text, 'bosque', 'Selva'));
    }
}
