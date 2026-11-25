<?php

namespace Database\Seeders;

/**
 * Resultado emocional de cada escena de "Cumbre Muda", redactado por el autor del ejemplo con el mismo
 * formato que devuelve el analizador (v/a/d en 0-1). Las alertas (abrupto/justificado) y los avisos
 * los calcula SceneEmotionService con las reglas reales; aquí solo se aporta lo que "diría la IA".
 *
 * Arco diseñado para que el gráfico se note: calma (E01) → miedo (E02) → esperanza (E03).
 * Contradicciones: E01 (1), E02 (2), E03 (2). Alertas rojas: salto de la escena E03 y perdón de Tomás.
 */
class CumbreMudaAnalyses
{
    /** @param array<string, int> $ids ids de personaje por clave (irene, tomas, lucia, marcos) */
    public function __construct(private readonly array $ids) {}

    public function forScene(string $key): array
    {
        return match ($key) {
            'e1' => $this->e1(),
            'e2' => $this->e2(),
            default => $this->e3(),
        };
    }

    private function e1(): array
    {
        return [
            'scene' => [
                'v' => 0.66, 'a' => 0.32, 'd' => 0.58, 'emotion' => 'calm',
                'summary' => 'Llegada tranquila en apariencia: el refugio es cálido, pero el aniversario de Dani y las evasivas de Marcos dejan una tensión latente.',
                'evidence' => 'Tomás mira la cuerda de la viga «como quien mira una tumba».',
                'change_justified' => null, 'change_explanation' => '',
            ],
            'characters' => [
                $this->character('irene', 0.62, 0.38, 0.62, 'calm', 'Cierra el refugio y reparte guardias con voz serena, pero baja la voz al dudar.', true, 'La frase «seguimos sin él» no encaja con quien nunca abandona a nadie.', null, ''),
                $this->character('tomas', 0.22, 0.30, 0.28, 'sadness', '«Un año exacto. Y seguís colgando su nombre en un cabo como si fuera un trofeo.»', false, '', null, ''),
                $this->character('lucia', 0.28, 0.72, 0.28, 'anxiety', '«Si se cae el generador nadie nos oye. Doce horas de radio y se acabó.»', false, '', null, ''),
                $this->character('marcos', 0.64, 0.30, 0.82, 'calm', 'Sirve té «demasiado tranquilo» y se ofrece al primer turno.', false, '', null, ''),
            ],
            'inconsistencies' => [[
                'fragment' => 'Y si alguien se retrasa o se hiere en la guardia, seguimos sin él.',
                'contradicts' => 'Nadie se queda atrás',
                'explanation' => 'Irene propone abandonar a quien se retrase, lo que rompe la regla irrompible «Nadie se queda atrás» y el límite de su ficha («nunca abandona a nadie en la montaña»). Tomás lo señala en la escena.',
                'severity' => 'high',
            ]],
            'suggestions' => [
                ['kind' => 'coherence', 'text' => 'Cambia la frase de Irene por: «Si alguien se retrasa o se hiere, nos quedamos con él hasta que llegue. Aquí nadie se queda atrás.» Mantiene la tensión y respeta su límite.', 'why' => 'Resuelve la contradicción con la regla y deja que Tomás desconfíe de otra cosa.'],
                ['kind' => 'emotion', 'text' => 'Añade un gesto de Tomás tocando el nombre bordado de Dani antes de hablar: refuerza el duelo sin explicarlo.', 'why' => 'Sitúa la tristeza inicial del personaje y prepara su estallido en el nudo.'],
                ['kind' => 'pacing', 'text' => 'Cierra con un sonido inquietante en el almacén para anticipar el hallazgo de la siguiente escena.', 'why' => 'La escena es tranquila: un gancho final sube el interés sin romper el tono.'],
            ],
        ];
    }

    private function e2(): array
    {
        return [
            'scene' => [
                'v' => 0.12, 'a' => 0.88, 'd' => 0.20, 'emotion' => 'fear',
                'summary' => 'El hallazgo del cabo cortado desata la acusación, el pánico y una salida imprudente: la escena sube de golpe a su pico de tensión.',
                'evidence' => '«Un golpe seco. La luz se va. Solo quedan las respiraciones y el filo del cabo.»',
                'change_justified' => true,
                'change_explanation' => 'El salto desde la calma está justificado: la prueba del cabo cortado cambia la naturaleza del conflicto.',
            ],
            'characters' => [
                $this->character('irene', 0.20, 0.80, 0.32, 'anxiety', 'Susurra «Esto no se rompió. Alguien lo cortó con una hoja» y no sabe en quién confiar.', false, '', true, 'Pasa del control a la ansiedad al descubrir la prueba: coherente con su miedo a otra muerte.'),
                $this->character('tomas', 0.08, 0.90, 0.78, 'anger', '«¡Mi hermano se mató por una cuerda que ya estaba cortada!»', true, 'Niega atención médica a un herido: contradice el juramento del médico y su propio límite, aunque la ira sea comprensible.', true, 'La ira explota al ver el cabo: está motivada por el duelo de un año.'),
                $this->character('lucia', 0.08, 0.90, 0.12, 'fear', 'Se lanza a la tormenta «sin esperar respuesta» pese a su pánico a la intemperie.', true, 'Sale al exterior con tormenta aunque su ficha dice que el exterior la paraliza.', null, ''),
                $this->character('marcos', 0.10, 0.82, 0.78, 'anger', '«No sé qué crees que has encontrado.» Esconde la mano congelada y se pone a la defensiva.', false, '', true, 'Pasa de la calma fingida a la ira al verse descubierto: coherente con su miedo a ser el culpable.'),
            ],
            'inconsistencies' => [
                [
                    'fragment' => 'Tienes la mano congelada, Marcos. Que se te pudra. No pienso tocarte.',
                    'contradicts' => 'Juramento del médico en altura',
                    'explanation' => 'Tomás es médico y su ficha dice que nunca deja sin atender a un herido. Negarse a curar a Marcos rompe el juramento del médico sin ninguna excepción (no hay peligro para el resto).',
                    'severity' => 'high',
                ],
                [
                    'fragment' => 'Lucía se calza los crampones, abre la puerta de servicio y se lanza al viento de ciento cuarenta kilómetros por hora.',
                    'contradicts' => 'La tormenta sella el refugio',
                    'explanation' => 'Con viento sostenido por encima de 100 km/h nadie sale al exterior. Además Lucía se paraliza fuera del refugio, así que su salida contradice la regla irrompible y su ficha.',
                    'severity' => 'high',
                ],
            ],
            'suggestions' => [
                ['kind' => 'coherence', 'text' => 'Haz que Tomás atienda la mano de Marcos mientras le acusa: «Voy a salvarte la mano para que tengas con qué contarlo todo.» Respeta el juramento y aumenta la tensión.', 'why' => 'Mantiene su integridad como médico y convierte el conflicto en algo más cruel y más interesante.'],
                ['kind' => 'coherence', 'text' => 'Que Lucía asegure la antena desde el conducto interior del tejado, o que salga atada a Irene con una cuerda y pague el coste en horas de generador.', 'why' => 'Evita romper la regla de la tormenta y encaja con la mecánica «Horas de generador».'],
                ['kind' => 'conflict', 'text' => 'Convierte la escena en una decisión jugable explícita: mostrar el cabo, esconderlo o enfrentar a Marcos a solas, cada una con su efecto en la confianza de cordada.', 'why' => 'Es el centro del nudo: las tres salidas ya están en el grafo de diálogos.'],
            ],
        ];
    }

    private function e3(): array
    {
        return [
            'scene' => [
                'v' => 0.70, 'a' => 0.42, 'd' => 0.58, 'emotion' => 'hope',
                'summary' => 'La confesión de Marcos y el descenso cierran la historia con una esperanza que llega demasiado rápido tras el terror de la escena anterior.',
                'evidence' => '«Bajamos juntos, y el cabo baja con nosotros.»',
                'change_justified' => false,
                'change_explanation' => 'El cierre pasa del terror a la esperanza sin una pausa de duelo ni consecuencia visible por la confesión.',
            ],
            'characters' => [
                $this->character('irene', 0.62, 0.45, 0.75, 'hope', 'Toma el control: guarda el cabo y fija la condición de bajar todos juntos y que Marcos responda.', false, '', true, 'Asume por fin la responsabilidad tras un año callando; el cambio es el cierre de su arco.'),
                $this->character('tomas', 0.82, 0.38, 0.55, 'tenderness', '«Está bien, Marcos. Ya pasó. Te perdono. Volvamos a casa todos juntos.»', true, 'Perdona de inmediato a quien cortó la cuerda de su hermano, contra su límite de no perdonar sin conocer la verdad completa.', false, 'Pasa de la ira al perdón en una sola réplica, sin nada que lo motive.'),
                $this->character('lucia', 0.30, 0.30, 0.30, 'sadness', 'Llora y cuestiona el perdón: «¿Así, sin más?»', false, '', true, 'El agotamiento tras la noche explica la bajada de tensión.'),
                $this->character('marcos', 0.14, 0.42, 0.18, 'guilt', '«Lo corté yo. [...] Y llevo un año fingiendo que fue el hielo.»', false, '', true, 'Confiesa cuando ya no puede sostener la mentira: la culpa justifica el desplome.'),
            ],
            'inconsistencies' => [
                [
                    'fragment' => 'Está bien, Marcos. Ya pasó. Te perdono. Volvamos a casa todos juntos.',
                    'contradicts' => 'Tomás Arce',
                    'explanation' => 'Tomás ha pasado toda la noche exigiendo la verdad y su ficha dice que jamás perdona sin conocerla por completo. Un perdón inmediato rompe su arco y resta peso a la confesión.',
                    'severity' => 'high',
                ],
                [
                    'fragment' => 'El viento aún sopla a ciento diez kilómetros por hora, pero un helicóptero rojo se acerca entre la bruma y aterriza en la terraza sin esfuerzo.',
                    'contradicts' => 'La tormenta sella el refugio',
                    'explanation' => 'Con más de 100 km/h ningún helicóptero puede volar. El rescate debería ocurrir en la ventana de calma anunciada por Lucía, no con la tormenta activa.',
                    'severity' => 'medium',
                ],
            ],
            'suggestions' => [
                ['kind' => 'emotion', 'text' => 'Sustituye el perdón inmediato por una negativa: «No te perdono. Pero no voy a dejar que caigas.» Mantiene su arco y su límite, y da más fuerza al final.', 'why' => 'Soluciona la alerta roja del personaje y convierte el cierre en algo menos fácil.'],
                ['kind' => 'coherence', 'text' => 'Ambienta el rescate en la ventana de calma que Lucía anuncia en la primera escena, o haz que bajen por la arista cuando el viento cede por debajo de los 100 km/h.', 'why' => 'Respeta la regla de la tormenta y cierra el hilo plantado en el parte meteorológico.'],
                ['kind' => 'pacing', 'text' => 'Añade un beat de tristeza compartida (Lucía y Tomás en silencio) antes del amanecer, para que el salto del terror a la esperanza no sea tan brusco.', 'why' => 'Suaviza la alerta roja de la escena: el desenlace necesita una pausa de duelo.'],
            ],
        ];
    }

    private function character(string $key, float $v, float $a, float $d, string $emotion, string $evidence, bool $outOfCharacter, string $reason, ?bool $justified, string $explanation): array
    {
        return [
            'character_id' => $this->ids[$key],
            'name' => match ($key) {
                'irene' => 'Irene Vallejo', 'tomas' => 'Tomás Arce', 'lucia' => 'Lucía Ferrer', default => 'Marcos Duarte',
            },
            'v' => $v, 'a' => $a, 'd' => $d, 'emotion' => $emotion,
            'evidence' => $evidence,
            'out_of_character' => $outOfCharacter,
            'out_of_character_reason' => $reason,
            'change_justified' => $justified,
            'change_explanation' => $explanation,
        ];
    }
}
