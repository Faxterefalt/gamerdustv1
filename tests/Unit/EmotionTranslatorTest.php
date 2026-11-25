<?php

namespace Tests\Unit;

use App\Services\Emotion\EmotionTranslator;
use Tests\TestCase;

class EmotionTranslatorTest extends TestCase
{
    private EmotionTranslator $translator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->translator = new EmotionTranslator;
    }

    public function test_las_bandas_de_tono_usan_limites_superiores_exclusivos(): void
    {
        $tone = fn (float $v) => $this->translator->labels($v, 0.5, 0.5)['tone'];

        $this->assertSame('Very negative', $tone(0.0));
        $this->assertSame('Very negative', $tone(0.199));
        $this->assertSame('Negative', $tone(0.2));
        $this->assertSame('Negative', $tone(0.399));
        $this->assertSame('Neutral', $tone(0.4));
        $this->assertSame('Positive', $tone(0.6));
        $this->assertSame('Positive', $tone(0.799));
        $this->assertSame('Very positive', $tone(0.8));
        $this->assertSame('Very positive', $tone(1.0));
    }

    public function test_bandas_de_tension_y_control(): void
    {
        $this->assertSame(['tone' => 'Neutral', 'tension' => 'Low', 'control' => 'Vulnerable'], $this->translator->labels(0.5, 0.349, 0.349));
        $this->assertSame(['tone' => 'Neutral', 'tension' => 'Medium', 'control' => 'On equal footing'], $this->translator->labels(0.5, 0.35, 0.35));
        $this->assertSame(['tone' => 'Neutral', 'tension' => 'Medium', 'control' => 'On equal footing'], $this->translator->labels(0.5, 0.649, 0.649));
        $this->assertSame(['tone' => 'Neutral', 'tension' => 'High', 'control' => 'In control'], $this->translator->labels(0.5, 0.65, 0.65));
    }

    public function test_la_emocion_mas_cercana_coincide_con_cada_centroide(): void
    {
        foreach (config('gamerdust.emotion.emotions') as $key => $centroid) {
            $this->assertSame($key, $this->translator->nearestEmotion($centroid['v'], $centroid['a'], $centroid['d']));
        }
    }

    public function test_la_emocion_mas_cercana_separa_miedo_de_ira_por_el_control(): void
    {
        $this->assertSame('fear', $this->translator->nearestEmotion(0.12, 0.82, 0.2));
        $this->assertSame('anger', $this->translator->nearestEmotion(0.12, 0.82, 0.7));
        $this->assertSame('neutral', $this->translator->nearestEmotion(0.5, 0.42, 0.5));
    }

    public function test_el_estado_del_autor_sustituye_la_activacion_por_la_intensidad(): void
    {
        $this->assertSame(['v' => 0.10, 'a' => 0.25, 'd' => 0.15], $this->translator->fromAuthor('fear', 'low'));
        $this->assertSame(['v' => 0.10, 'a' => 0.50, 'd' => 0.15], $this->translator->fromAuthor('fear', 'medium'));
        $this->assertSame(['v' => 0.85, 'a' => 0.80, 'd' => 0.65], $this->translator->fromAuthor('joy', 'high'));
        // Sin intensidad: la activación propia de la emoción.
        $this->assertSame(['v' => 0.72, 'a' => 0.20, 'd' => 0.60], $this->translator->fromAuthor('calm', null));
        $this->assertNull($this->translator->fromAuthor('tension', 'high'));
        $this->assertNull($this->translator->fromAuthor(null, 'high'));
    }

    public function test_el_catalogo_expone_colores_y_bandas_sin_centroides(): void
    {
        $catalog = $this->translator->catalog();

        $this->assertSame(['color' => '#e5544c'], $catalog['emotions']['anger']);
        $this->assertSame(['low', 'medium', 'high'], $catalog['intensities']);
        $this->assertSame([0.2, 'Very negative'], $catalog['labels']['tone'][0]);
        $this->assertCount(12, $catalog['emotions']);
    }
}
