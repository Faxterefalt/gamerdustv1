<?php

namespace Database\Seeders;

use Illuminate\Support\Str;

/**
 * Guiones de las tres escenas de "Cumbre Muda" (bloques {id, kind, text} del editor de guion).
 *
 * Contradicciones plantadas a propósito (las detecta/explica CumbreMudaAnalyses):
 *  - E01: Irene propone seguir sin quien se retrase (rompe «Nadie se queda atrás» y su límite).
 *  - E02: Tomás se niega a curar a Marcos (rompe el juramento del médico y su límite).
 *  - E02: Lucía sale a la tormenta de 140 km/h (rompe «La tormenta sella el refugio» y su límite).
 *  - E03: Tomás perdona a Marcos de inmediato (fuera de personaje y salto emocional sin justificar).
 *  - E03: aterriza un helicóptero con viento de 110 km/h (rompe «La tormenta sella el refugio»).
 */
class CumbreMudaScripts
{
    /** @return list<array{id: string, kind: string, text: string}> */
    public function e1(): array
    {
        return $this->blocks([
            ['heading', 'INT. REFUGIO CUMBRE MUDA - SALA COMÚN - ATARDECER'],
            ['action', 'El viento aúlla contra los postigos. Una estufa de hierro tiñe de naranja las caras de cuatro personas que sacuden la nieve de sus chaquetas. Sobre la mesa, una radio vieja. De la viga cuelga una cuerda azul con una etiqueta: DANI.'],
            ['character', 'IRENE'],
            ['parenthetical', 'cerrando el último cerrojo'],
            ['dialogue', 'Puerta cerrada. Desde ahora el refugio es nuestro mundo hasta que pase la tormenta. Tres días, dice Lucía.'],
            ['character', 'LUCÍA'],
            ['parenthetical', 'tecleando con dedos temblorosos'],
            ['dialogue', 'Tres días si los modelos aciertan. Y llevan un año fallando conmigo.'],
            ['action', 'Tomás Arce no se quita el abrigo. Mira la cuerda de la viga como quien mira una tumba.'],
            ['character', 'TOMÁS'],
            ['parenthetical', 'sin levantar la vista'],
            ['dialogue', 'Un año exacto. Y seguís colgando su nombre en un cabo como si fuera un trofeo.'],
            ['character', 'MARCOS'],
            ['parenthetical', 'sirviendo té, demasiado tranquilo'],
            ['dialogue', 'Nadie lo cuelga como trofeo, Tomás. Es costumbre del refugio: la cuerda que falla se guarda.'],
            ['action', 'Irene percibe cómo Marcos evita mirar el extremo del cabo.'],
            ['character', 'IRENE'],
            ['dialogue', 'Escuchadme todos. Dos guardias por noche y la radio abierta en la única frecuencia que tenemos.'],
            ['action', 'El generador tose y la luz parpadea. Lucía se encoge.'],
            ['character', 'LUCÍA'],
            ['dialogue', 'Si se cae el generador nadie nos oye. Doce horas de radio y se acabó.'],
            ['character', 'IRENE'],
            ['parenthetical', 'en voz baja, casi para sí'],
            ['dialogue', 'Y si alguien se retrasa o se hiere en la guardia, seguimos sin él. No podemos arriesgar a toda la cordada.'],
            ['action', 'Nadie responde. Tomás levanta por fin los ojos hacia Irene, incrédulo.'],
            ['character', 'TOMÁS'],
            ['dialogue', '¿Tú, Irene? ¿La de «nadie se queda atrás»?'],
            ['action', 'Irene aprieta la mandíbula. Fuera, el viento cambia de nota.'],
            ['character', 'MARCOS'],
            ['dialogue', 'Reparte las guardias, Irene. Yo me ofrezco al primer turno: conozco cada crujido de este lugar.'],
            ['action', 'Al fondo del pasillo, la puerta del almacén se mueve sola con la corriente. Irene la ve y decide no decir nada. Todavía.'],
        ]);
    }

    /** @return list<array{id: string, kind: string, text: string}> */
    public function e2(): array
    {
        return $this->blocks([
            ['heading', 'INT. REFUGIO CUMBRE MUDA - ALMACÉN DE CUERDAS - NOCHE'],
            ['action', 'Madrugada. Irene baja con la linterna entre colgadores de cuerdas y piolets. El viento golpea el techo de chapa como si quisiera entrar.'],
            ['action', 'Detrás de un cajón de mosquetones encuentra un cabo azul con un corte limpio, sin deshilachar. En la etiqueta, la letra de Marcos: «Cordada Dani, tramo 3».'],
            ['character', 'IRENE'],
            ['parenthetical', 'susurrando'],
            ['dialogue', 'Esto no se rompió. Alguien lo cortó con una hoja.'],
            ['action', 'Pasos. Tomás aparece en la puerta con el botiquín. Ve el cabo en las manos de Irene.'],
            ['character', 'TOMÁS'],
            ['dialogue', 'Dámelo.'],
            ['character', 'IRENE'],
            ['dialogue', 'Tomás, escucha, no es lo que...'],
            ['character', 'TOMÁS'],
            ['parenthetical', 'rugiendo'],
            ['dialogue', '¡Dámelo! ¡Mi hermano se mató por una cuerda que ya estaba cortada!'],
            ['action', 'Marcos entra tras él con la mano izquierda envuelta en un trapo ensangrentado: una congelación abierta que lleva horas ocultando.'],
            ['character', 'MARCOS'],
            ['dialogue', 'No sé qué crees que has encontrado.'],
            ['character', 'TOMÁS'],
            ['parenthetical', 'sin moverse, con el botiquín en la mano'],
            ['dialogue', 'Tienes la mano congelada, Marcos. Que se te pudra. No pienso tocarte.'],
            ['action', 'Lucía, alertada por los gritos, asoma al pasillo. Mira el cabo y se pone blanca.'],
            ['character', 'LUCÍA'],
            ['dialogue', 'La antena. Si Marcos nos oyó hablar, puede cortar la radio. Voy al tejado a asegurarla ahora mismo.'],
            ['action', 'Sin esperar respuesta, Lucía se calza los crampones, abre la puerta de servicio y se lanza al viento de ciento cuarenta kilómetros por hora.'],
            ['action', 'Un golpe seco. La luz se va. Solo quedan las respiraciones y el filo del cabo en la mano de Irene.'],
            ['character', 'IRENE'],
            ['dialogue', 'Tengo que decidir qué hago con esto. Y cualquier decisión nos va a costar algo.'],
        ]);
    }

    /** @return list<array{id: string, kind: string, text: string}> */
    public function e3(): array
    {
        return $this->blocks([
            ['heading', 'EXT. REFUGIO CUMBRE MUDA - TERRAZA - AMANECER'],
            ['action', 'El sol rompe sobre el glaciar. El viento aún sopla a ciento diez kilómetros por hora, pero un helicóptero rojo se acerca entre la bruma y aterriza en la terraza sin esfuerzo.'],
            ['action', 'Marcos, de rodillas en la nieve, sostiene el cabo azul. Irene, Tomás y Lucía, con el brazo en cabestrillo, lo rodean.'],
            ['character', 'MARCOS'],
            ['parenthetical', 'sin voz'],
            ['dialogue', 'Lo corté yo. Colgábamos los cuatro de un tramo que cedía y Dani pesaba demasiado. Corté. Y llevo un año fingiendo que fue el hielo.'],
            ['character', 'TOMÁS'],
            ['parenthetical', 'tras un largo silencio'],
            ['dialogue', 'Está bien, Marcos. Ya pasó. Te perdono. Volvamos a casa todos juntos.'],
            ['character', 'LUCÍA'],
            ['parenthetical', 'llorando'],
            ['dialogue', '¿Así, sin más? Hace unas horas querías matarlo.'],
            ['action', 'Irene guarda el cabo en la mochila. Siente el peso de lo que calló en la sala común y de lo que ahora puede decidir.'],
            ['character', 'IRENE'],
            ['dialogue', 'Nadie se queda atrás. Tampoco Marcos. Pero nadie se queda sin responder por lo que hizo. Bajamos juntos, y el cabo baja con nosotros.'],
            ['action', 'Marcos asiente. El helicóptero ruge. Por primera vez en un año, la montaña parece callar.'],
        ]);
    }

    /**
     * @param  list<array{0: string, 1: string}>  $items
     * @return list<array{id: string, kind: string, text: string}>
     */
    private function blocks(array $items): array
    {
        return array_map(fn (array $item) => ['id' => (string) Str::uuid(), 'kind' => $item[0], 'text' => $item[1]], $items);
    }
}
