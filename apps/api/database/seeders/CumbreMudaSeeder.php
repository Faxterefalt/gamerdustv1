<?php

namespace Database\Seeders;

use App\Contracts\EmotionAnalyzer;
use App\Models\AiFeedback;
use App\Models\Character;
use App\Models\DialogueNode;
use App\Models\EmotionalAnalysis;
use App\Models\LoreEntry;
use App\Models\Mechanic;
use App\Models\Project;
use App\Models\Scene;
use App\Models\User;
use App\Services\Branching\ReferenceSyncService;
use App\Services\Cost\NarrativeCostEstimatorService;
use App\Services\Emotion\EmotionChangeDetector;
use App\Services\Emotion\EmotionTranslator;
use App\Services\Emotion\SceneContextBuilder;
use App\Services\Emotion\SceneEmotionResult;
use App\Services\Emotion\SceneEmotionService;
use App\Services\Narrative\NarrativeValidationService;
use App\Services\Script\ScenePlainText;
use App\Services\Script\ScriptService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Proyecto de demostración "Cumbre Muda" para el usuario de pruebas (test@example.com).
 *
 * Pensado para enseñar casi todo Gamerdust a la vez:
 *  - portada de montaña (la portada se elige por género: "Aventura");
 *  - Biblia completa (esencia, 4 personajes con límites y emoción inicial, lugares jerárquicos, reglas y vínculos);
 *  - 3 escenas (inicio, nudo, desenlace) con guion y versiones, cada una con los 4 personajes;
 *  - grafo de ramificación con decisiones, condiciones, consecuencias, referencias {{Título}} y una opción rota;
 *  - evolución emocional con alertas ámbar y rojas;
 *  - 5 contradicciones deliberadas, cada una con su alternativa propuesta.
 *
 * El análisis emocional NO llama a la IA: se guardan resultados redactados por el autor del ejemplo
 * a través del mismo SceneEmotionService (mismo hash, mismas reglas de cambio abrupto y mismos estados
 * por personaje que si los hubiera calculado la IA), así que el seed funciona sin red ni clave de Groq.
 * El origen guardado (source) es el del motor activo, para que "Analizar emociones" lo reconozca como caché.
 *
 * Es idempotente: si el proyecto ya existe, lo borra y lo vuelve a crear.
 *
 *   php artisan db:seed --class=CumbreMudaSeeder
 */
class CumbreMudaSeeder extends Seeder
{
    public const TITLE = 'Cumbre Muda';

    private User $user;

    private Project $project;

    /** @var array<string, Character> */
    private array $chars = [];

    /** @var array<string, LoreEntry> */
    private array $lore = [];

    /** @var array<string, Scene> */
    private array $scenes = [];

    /** @var array<string, Mechanic> */
    private array $mechanics = [];

    public function run(): void
    {
        $this->user = User::query()->firstOrCreate(
            ['email' => 'test@example.com'],
            ['name' => 'Test User', 'password' => Hash::make('password')],
        );
        $this->user->forceFill(['email_verified_at' => $this->user->email_verified_at ?? now()])->save();

        // Idempotente: las tablas de dominio caen en cascada con el proyecto.
        $this->user->projects()->where('title', self::TITLE)->get()->each->delete();

        $this->createProject();
        $this->createCharacters();
        $this->createLore();
        $this->createMechanics();
        $this->createScenesWithScripts();
        $this->linkEverything();
        $this->createBranching();
        $this->createCosts();
        $this->createEmotionalAnalyses();
        $this->createComments();
        $this->createFeedback();

        // Contradicciones de reglas (reglas irrompibles rotas, coste sin definir...): las mismas que ve el autor en el Panel.
        app(NarrativeValidationService::class)->run($this->project);
    }

    // ───────────────────────────── Proyecto ─────────────────────────────

    private function createProject(): void
    {
        $this->project = $this->user->projects()->create([
            'title' => self::TITLE,
            'description' => 'Una tormenta de tres días encierra a cuatro personas en un refugio a 5.800 metros. Una de ellas cortó la cuerda que mató a Dani Arce hace un año. Thriller de supervivencia y culpa donde cada decisión cuesta confianza.',
            'game_genre' => 'Aventura', // portada de montaña (imageForGenre)
            'language' => 'es',
            'narrative_type' => 'branching',
            'branching_enabled' => true,
            'premise' => 'Cuatro supervivientes de una expedición fallida quedan atrapados un año después en el refugio Cumbre Muda. Irene, la guía, descubre que la cuerda de Dani no se rompió: la cortaron.',
            'central_conflict' => 'Irene debe elegir entre proteger la unidad de la cordada o exponer al culpable, sabiendo que la verdad puede romper al único grupo que le queda.',
            'target_audience' => 'Jugadores de aventuras narrativas con decisiones morales, tensión contenida y espacios cerrados.',
            'status' => 'in_progress',
            'favorite' => true,
        ]);

        $this->project->constraint()->create([
            'narrative_genre' => 'mystery',
            'central_theme' => 'culpa, lealtad, supervivencia',
            'setting' => 'Refugio Cumbre Muda, estación de alta montaña a 5.800 m aislada por una tormenta de tres días.',
            'player_objective' => 'Sobrevivir a la tormenta con la cordada unida y decidir qué hacer con la verdad sobre la muerte de Dani.',
            'expected_outcome' => 'El jugador siente el peso de cada confianza ganada o perdida y llega al final con una decisión moral que no tiene una respuesta limpia.',
            'main_emotional_tone' => 'tensión contenida',
            'dominant_emotion' => 'anxiety',
            'secondary_emotions' => ['guilt', 'sadness', 'hope'],
            'world_type' => 'Realista, alta montaña',
            'player_role' => 'Irene Vallejo, guía y jefa del refugio',
            'branching_level' => 'high',
            'required_elements' => ['Una decisión que cueste confianza', 'Una confesión', 'Un final sin culpable único'],
            'forbidden_elements' => ['Villano caricaturesco', 'Soluciones por violencia gratuita', 'Magia o fantasía'],
            'creative_notes' => 'Tono sobrio, frases cortas, silencios. El viento es un personaje más. Ejemplo pensado para mostrar contradicciones detectables y alternativas de la IA.',
        ]);
    }

    // ──────────────────────────── Personajes ────────────────────────────

    private function createCharacters(): void
    {
        $defs = [
            'irene' => [
                'name' => 'Irene Vallejo', 'role' => 'Protagonista', 'archetype' => 'Guía responsable', 'age' => 38, 'gender' => 'Mujer',
                'background' => 'Jefa del refugio Cumbre Muda. Fue la última en ver con vida a Dani Arce y hace un año encontró el cabo cortado sin decir nada.',
                'personality' => 'Metódica, protectora y con una calma que cuesta mantener. Prefiere el silencio a la mentira, aunque llevaba un año callando.',
                'speech_style' => 'Frases cortas y órdenes claras. Baja la voz cuando duda.',
                'motivation' => 'Sacar viva a toda la cordada y recuperar la confianza que perdió al callar.',
                'fear' => 'Que otro compañero muera por una decisión suya.',
                'desire' => 'Bajar de la montaña sin secretos.',
                'emotional_arc' => 'De la calma aparente a la responsabilidad activa.',
                'initial_emotion' => 'calm', 'initial_intensity' => 'medium',
                'visual_description' => 'Chaqueta roja desgastada, trenza gris, cicatriz de crampón en la ceja.',
                'voice_notes' => 'Voz grave, pausada.',
                'limits' => 'Nunca abandona a nadie en la montaña y nunca miente a su equipo sobre el riesgo.',
            ],
            'tomas' => [
                'name' => 'Tomás Arce', 'role' => 'Médico del refugio', 'archetype' => 'Hermano en duelo', 'age' => 34, 'gender' => 'Hombre',
                'background' => 'Médico de montaña y hermano pequeño de Dani. Lleva un año sin subir y vuelve para cerrar el duelo.',
                'personality' => 'Íntegro, sensible y con un enfado antiguo que no sabe dónde poner. Cuida incluso a quien odia.',
                'speech_style' => 'Preciso y clínico; cuando se rompe, grita.',
                'motivation' => 'Saber la verdad completa de cómo murió su hermano.',
                'fear' => 'Descubrir que Dani pudo salvarse.',
                'desire' => 'Una explicación que le permita llorar.',
                'emotional_arc' => 'De un duelo contenido a la ira y, al final, a una justicia difícil.',
                'initial_emotion' => 'sadness', 'initial_intensity' => 'low',
                'visual_description' => 'Abrigo verde militar, barba corta, manos siempre ocupadas con el botiquín.',
                'voice_notes' => 'Voz seca y baja.',
                'limits' => 'No deja sin atender a un herido, aunque lo odie, y jamás perdona sin conocer la verdad completa.',
            ],
            'lucia' => [
                'name' => 'Lucía Ferrer', 'role' => 'Meteoróloga', 'archetype' => 'Testigo asustada', 'age' => 26, 'gender' => 'Mujer',
                'background' => 'Meteoróloga becada en el refugio. Su pronóstico falló el día de la caída y se cree la responsable.',
                'personality' => 'Brillante, nerviosa y honesta hasta ser incómoda. Piensa en voz alta cuando tiene miedo.',
                'speech_style' => 'Rápida, con datos y cifras; se corta a sí misma.',
                'motivation' => 'Demostrar que sus modelos eran correctos y mantener la radio viva.',
                'fear' => 'La intemperie: se paraliza fuera del refugio.',
                'desire' => 'Que alguien le diga que no fue su culpa.',
                'emotional_arc' => 'Del pánico al agotamiento lúcido.',
                'initial_emotion' => 'anxiety', 'initial_intensity' => 'medium',
                'visual_description' => 'Gorro de lana, gafas de ventisca, portátil siempre bajo el brazo.',
                'voice_notes' => 'Voz aguda cuando se asusta.',
                'limits' => 'No sale al exterior con tormenta: su pánico la paraliza fuera del refugio.',
            ],
            'marcos' => [
                'name' => 'Marcos Duarte', 'role' => 'Alpinista veterano', 'archetype' => 'Culpable amable', 'age' => 52, 'gender' => 'Hombre',
                'background' => 'Veterano del macizo y mentor de Irene. Cortó el cabo para salvar a tres compañeros y lleva un año fingiendo que fue el hielo.',
                'personality' => 'Carismático, protector y experto en esquivar preguntas. Se cree el único capaz de cargar con la decisión.',
                'speech_style' => 'Amable, con refranes de montaña; cambia de tema cuando le aprietan.',
                'motivation' => 'Que la cordada baje viva y nadie lo vea como un asesino.',
                'fear' => 'Que lo recuerden solo como el hombre que cortó la cuerda.',
                'desire' => 'Ser perdonado sin tener que confesar.',
                'emotional_arc' => 'De la calma fingida a la ira defensiva y a la culpa.',
                'initial_emotion' => 'calm', 'initial_intensity' => 'low',
                'visual_description' => 'Barba blanca, mirada clara, manos curtidas con una alianza que no es suya.',
                'voice_notes' => 'Voz cálida y grave.',
                'limits' => 'Nunca admite un error en voz alta, salvo ante quien ya lo sabe.',
            ],
        ];

        foreach ($defs as $key => $data) {
            $this->chars[$key] = $this->project->characters()->create($data);
        }
    }

    // ───────────────────────────── Biblia (lore) ─────────────────────────────

    private function createLore(): void
    {
        $place = fn (string $key, string $title, string $subtype, string $description, string $function, string $tone, string $access, ?string $parent = null) => $this->lore[$key] = $this->project->loreEntries()->create([
            'title' => $title, 'type' => 'location', 'subtype' => $subtype, 'parent_id' => $parent ? $this->lore[$parent]->id : null,
            'description' => $description, 'narrative_function' => $function, 'emotional_tone' => $tone, 'access' => $access,
        ]);

        $place('macizo', 'Macizo de la Cumbre Muda', 'region', 'Cordal de glaciares y aristas donde el viento se oye a kilómetros pero las voces no llegan a ningún sitio.', 'Escenario global: la montaña es testigo y presión constante.', 'asombro opresivo', 'Solo por la arista norte, en jornada y con buen tiempo.');
        $place('refugio', 'Refugio Cumbre Muda', 'building', 'Refugio de piedra y chapa a 5.800 m con sala común, almacén y terraza. Sin cobertura; solo una radio.', 'Espacio cerrado donde se concentra el conflicto entre los cuatro.', 'claustrofobia', 'Se cierra por dentro con tormenta.', 'macizo');
        $place('sala', 'Sala común', 'interior', 'Estufa de hierro, mesa larga y la radio. Una cuerda con el nombre de Dani cuelga de la viga.', 'Primer encuentro y reparto de turnos: aquí se siembran las sospechas.', 'calidez inquieta', 'Entrada principal del refugio.', 'refugio');
        $place('almacen', 'Almacén de cuerdas', 'interior', 'Colgadores de cuerdas, piolets y cajones de mosquetones. Hace más frío que fuera.', 'Aquí aparece la prueba: el cabo cortado.', 'miedo contenido', 'Pasillo del fondo; la puerta cierra mal.', 'refugio');
        $place('terraza', 'Terraza del refugio', 'exterior', 'Plataforma de nieve compactada con vistas al glaciar. Única superficie de aterrizaje.', 'Lugar del desenlace: confesión y descenso.', 'alivio frágil', 'Puerta de servicio; solo se abre con calma de viento.', 'refugio');

        $rule = fn (string $key, string $title, string $subtype, string $statement, string $rigidity, string $scope, string $origin, ?string $consequence, ?string $exceptions, string $function) => $this->lore[$key] = $this->project->loreEntries()->create([
            'title' => $title, 'type' => 'rule', 'subtype' => $subtype, 'statement' => $statement, 'rigidity' => $rigidity, 'scope' => $scope,
            'origin' => $origin, 'consequence' => $consequence, 'exceptions' => $exceptions,
            'description' => $statement, 'narrative_function' => $function, 'emotional_tone' => 'deber',
        ]);

        $rule('r_atras', 'Nadie se queda atrás', 'society', 'En una cordada nadie abandona a un compañero, ni vivo ni herido.', 'unbreakable', 'global',
            'Código no escrito del macizo desde las primeras expediciones.', 'Quien la rompe pierde el aval de la federación y el respeto de toda la montaña.', null,
            'Base moral de la historia: lo que Marcos rompió y lo que Irene debe sostener.');
        $rule('r_tormenta', 'La tormenta sella el refugio', 'physics', 'Con viento sostenido de más de 100 km/h nadie sale al exterior y ningún helicóptero puede volar.', 'unbreakable', 'linked',
            'Física de la arista norte: el viento arranca cualquier cosa que no esté anclada.', 'Quien sale con tormenta no vuelve; el rescate solo es posible en una ventana de calma.', null,
            'Cierra la historia en el refugio y da urgencia: el rescate depende del tiempo.');
        // Deliberadamente SIN consecuencia: la validación de coherencia lo señala (regla de coste sin definir).
        $rule('r_frecuencia', 'Una sola frecuencia', 'technology', 'La radio emite en una única frecuencia y el generador solo aguanta doce horas de transmisión.', 'costly', 'linked',
            'Equipo antiguo del refugio, nunca renovado.', null, 'Se puede estirar apagando la estufa, pero entonces el refugio se enfría.',
            'Recurso escaso: cada llamada cuesta horas de generador.');
        $rule('r_medico', 'Juramento del médico en altura', 'society', 'El médico atiende a todo herido, incluso al enemigo.', 'flexible', 'global',
            'Tradición de los médicos de montaña.', 'Quien se niega arrastra la sospecha de haber dejado morir.', 'Solo si atender al herido pone en peligro al resto.',
            'Pone a prueba a Tomás: ¿su integridad aguanta la rabia?');

        // Otras entradas de la Biblia (objeto, hecho e historia) para que el catálogo no sea solo lugares y reglas.
        $this->lore['cabo'] = $this->project->loreEntries()->create([
            'title' => 'El cabo azul de Dani', 'type' => 'object',
            'description' => 'Cuerda dinámica azul de 9,8 mm con la etiqueta «Cordada Dani, tramo 3». El extremo muestra un corte limpio, sin deshilachar.',
            'narrative_function' => 'Prueba física del delito: dispara el conflicto del nudo.', 'emotional_tone' => 'dolor',
        ]);
        $this->lore['caida'] = $this->project->loreEntries()->create([
            'title' => 'La caída de la arista norte', 'type' => 'event',
            'description' => 'Hace un año, cuatro cordadas colgaban de un tramo que cedía. Dani Arce cayó; los otros tres sobrevivieron.',
            'narrative_function' => 'Hecho fundacional: todo el conflicto es consecuencia de aquella decisión.', 'emotional_tone' => 'culpa',
        ]);
    }

    // ───────────────────────────── Mecánicas ─────────────────────────────

    private function createMechanics(): void
    {
        $this->mechanics['confianza'] = $this->project->mechanics()->create([
            'title' => 'Confianza de cordada', 'kind' => 'decision', 'icon' => 'trust',
            'description' => 'Cada personaje tiene un nivel de confianza hacia Irene (0-3) que cambia con lo que dices, ocultas o haces.',
            'activation' => 'Al final de cada decisión importante del diálogo.',
            'narrative_effect' => 'Desbloquea o cierra opciones de confesión, y decide quién acompaña a Irene en el desenlace.',
            'playable_actions' => "Decir la verdad\nOcultar información\nTomar partido en una discusión",
            'restrictions' => 'No se puede subir la confianza de todos a la vez: ayudar a uno cuesta con otro.',
            'conflict' => 'Proteger a Tomás cuesta la confianza de Marcos, y al revés.',
        ]);
        $this->mechanics['inspeccion'] = $this->project->mechanics()->create([
            'title' => 'Inspección del refugio', 'kind' => 'exploration', 'icon' => 'exploration',
            'description' => 'Irene recorre el refugio con linterna y examina objetos para encontrar pistas.',
            'activation' => 'Al bajar al almacén durante la guardia nocturna.',
            'narrative_effect' => 'Revela el cabo cortado y otros indicios que cambian el diálogo.',
            'playable_actions' => "Examinar cajones\nLeer etiquetas\nComparar cortes",
            'restrictions' => 'La linterna dura lo que el generador.',
            'conflict' => 'Cada minuto de búsqueda es un minuto sin vigilar a los demás.',
        ]);
        $this->mechanics['generador'] = $this->project->mechanics()->create([
            'title' => 'Horas de generador', 'kind' => 'resource', 'icon' => 'footsteps',
            'description' => 'El generador da doce horas de radio y luz. Cada acción grande (llamar, salir, calentar) gasta horas.',
            'activation' => 'Se consulta en cualquier momento; se gasta al decidir.',
            'narrative_effect' => 'Si se agota, se pierde la radio y el rescate depende solo de la ventana de calma.',
            'playable_actions' => "Llamar por radio\nApagar la estufa\nRacionar luz",
            'restrictions' => 'No se recarga durante la tormenta.',
            'conflict' => 'Calentar el refugio frente a mantener la radio.',
        ]);
        $this->mechanics['interrogatorio'] = $this->project->mechanics()->create([
            'title' => 'Interrogatorio bajo presión', 'kind' => 'decision', 'icon' => 'dialogue',
            'description' => 'Conversaciones cronometradas donde cada respuesta mueve la tensión de la escena.',
            'activation' => 'Al enfrentar a Marcos con la prueba.',
            'narrative_effect' => 'Determina si Marcos confiesa, huye o se cierra.',
            'playable_actions' => "Presionar\nCalmar\nMostrar la prueba",
            'restrictions' => 'Solo hay tres turnos antes de que alguien estalle.',
            'conflict' => 'Presionar da respuestas, pero rompe a Tomás.',
        ]);
    }

    // ─────────────────────── Escenas + guion + versiones ───────────────────────

    private function createScenesWithScripts(): void
    {
        $scripts = new CumbreMudaScripts;
        $service = app(ScriptService::class);
        $everyone = collect($this->chars)->pluck('id')->all();

        $defs = [
            'e1' => [
                'title' => 'Llegada al refugio', 'act' => 'Acto I · Inicio', 'location' => 'sala',
                'meta' => [
                    'summary' => 'Los cuatro se encierran en el refugio cuando cae la tormenta. Aflora la tensión por el aniversario de la muerte de Dani y Irene reparte las guardias.',
                    'conflict' => 'Irene necesita que el grupo coopere, pero Tomás no soporta a Marcos y Marcos esquiva toda pregunta.',
                    'expected_emotion' => 'calm', 'interest_level' => 6, 'scene_type' => 'presentación',
                    'player_decision' => 'Con quién hacer la primera guardia: Marcos, Tomás o sola.',
                    'consequence' => 'Quien vigile al otro decide quién baja primero al almacén.',
                    'estimated_cost' => 'medium',
                ],
                'blocks' => $scripts->e1(),
            ],
            'e2' => [
                'title' => 'El cabo cortado', 'act' => 'Acto II · Nudo', 'location' => 'almacen',
                'meta' => [
                    'summary' => 'De madrugada, Irene encuentra el cabo azul con un corte limpio. Tomás lo ve, estalla y se desata la sospecha sobre Marcos mientras la tormenta aprieta.',
                    'conflict' => 'Irene debe decidir si muestra, esconde o confronta, sabiendo que cualquier camino rompe la confianza de alguien.',
                    'expected_emotion' => 'fear', 'interest_level' => 9, 'scene_type' => 'revelación',
                    'player_decision' => 'Mostrar el cabo a Tomás, esconderlo o enfrentar a Marcos a solas.',
                    'consequence' => 'Marcos huye, se cierra o confiesa según cómo se gestione; la confianza de cordada cambia.',
                    'estimated_cost' => 'high',
                ],
                'blocks' => $scripts->e2(),
            ],
            'e3' => [
                'title' => 'Amanecer sin viento', 'act' => 'Acto III · Desenlace', 'location' => 'terraza',
                'meta' => [
                    'summary' => 'En la terraza, al amanecer, Marcos confiesa que cortó la cuerda para salvar al resto. Irene decide cómo termina la historia.',
                    'conflict' => 'Perdón, justicia o silencio: ningún final repara la pérdida de Dani.',
                    'expected_emotion' => 'hope', 'interest_level' => 8, 'scene_type' => 'desenlace',
                    'player_decision' => 'Descenso con testigos, juicio de Tomás o pacto de silencio.',
                    'consequence' => 'Determina el final y el destino de Marcos, y qué recuerda la montaña de Irene.',
                    'estimated_cost' => 'high',
                ],
                'blocks' => $scripts->e3(),
            ],
        ];

        foreach ($defs as $key => $def) {
            $scene = $service->createScene($this->project, $def['title'], $def['act'], $this->user->id); // v1: borrador inicial
            $blocks = $def['blocks'];
            $location = $this->lore[$def['location']]->id;

            // v2: primer borrador a medias, sin personajes aún vinculados al completo.
            $service->save($scene, array_slice($blocks, 0, (int) ceil(count($blocks) * 0.5)), array_slice($everyone, 0, 2), $location, $this->user->id);
            // v3: guion final con los cuatro personajes.
            $scene = $service->save($scene, $blocks, $everyone, $location, $this->user->id);

            $scene->update($def['meta']);
            $this->scenes[$key] = $scene->refresh();
        }
    }

    // ───────────────────────── Vínculos de la Biblia ─────────────────────────

    private function linkEverything(): void
    {
        $link = function (string $a, string $b): void {
            $this->lore[$a]->linkedEntries()->syncWithoutDetaching([$this->lore[$b]->id]);
            $this->lore[$b]->linkedEntries()->syncWithoutDetaching([$this->lore[$a]->id]);
        };

        // Lugar ↔ regla (se guardan en ambos sentidos).
        $link('refugio', 'r_atras');
        $link('refugio', 'r_medico');
        $link('sala', 'r_frecuencia');
        $link('almacen', 'r_tormenta');
        $link('terraza', 'r_tormenta');
        // Lugar ↔ objeto/hecho.
        $link('almacen', 'cabo');
        $link('macizo', 'caida');

        // Personajes ↔ reglas: quién la impone y quién la rompe (alimenta validación e IA).
        $this->chars['irene']->loreEntries()->attach($this->lore['r_atras']->id, ['role' => 'enforces']);
        $this->chars['tomas']->loreEntries()->attach($this->lore['r_medico']->id, ['role' => 'enforces']);
        $this->chars['lucia']->loreEntries()->attach($this->lore['r_tormenta']->id, ['role' => 'breaks']);
        $this->chars['marcos']->loreEntries()->attach($this->lore['r_atras']->id, ['role' => 'breaks']);
        $this->chars['marcos']->loreEntries()->attach($this->lore['cabo']->id);
        $this->chars['tomas']->loreEntries()->attach($this->lore['caida']->id);

        // Escenas que ponen a prueba cada regla.
        $this->lore['r_atras']->scenes()->attach([$this->scenes['e1']->id, $this->scenes['e3']->id]);
        $this->lore['r_tormenta']->scenes()->attach([$this->scenes['e2']->id, $this->scenes['e3']->id]);
        $this->lore['r_frecuencia']->scenes()->attach([$this->scenes['e1']->id]);
        $this->lore['r_medico']->scenes()->attach([$this->scenes['e2']->id]);

        // Mecánicas ↔ escenas, personajes y reglas.
        $all = collect($this->chars)->pluck('id')->all();
        $this->mechanics['confianza']->scenes()->attach(collect($this->scenes)->pluck('id')->all());
        $this->mechanics['confianza']->characters()->attach($all);
        $this->mechanics['inspeccion']->scenes()->attach([$this->scenes['e2']->id]);
        $this->mechanics['inspeccion']->characters()->attach([$this->chars['irene']->id]);
        $this->mechanics['generador']->scenes()->attach([$this->scenes['e1']->id, $this->scenes['e2']->id]);
        $this->mechanics['generador']->characters()->attach([$this->chars['lucia']->id, $this->chars['irene']->id]);
        $this->mechanics['interrogatorio']->scenes()->attach([$this->scenes['e2']->id, $this->scenes['e3']->id]);
        $this->mechanics['interrogatorio']->characters()->attach([$this->chars['marcos']->id, $this->chars['tomas']->id, $this->chars['irene']->id]);

        $this->lore['r_frecuencia']->mechanics()->attach($this->mechanics['generador']->id);
        $this->lore['r_atras']->mechanics()->attach($this->mechanics['confianza']->id);
        $this->lore['cabo']->mechanics()->attach($this->mechanics['inspeccion']->id);
    }

    // ──────────────────────── Ramificación (diálogos) ────────────────────────

    private function createBranching(): void
    {
        /** @var array<string, DialogueNode> $n */
        $n = [];
        $i = 0;

        // El nodo inicial es el de menor id: se crea primero.
        $node = function (string $title, string $scene, ?string $char, string $type, string $tone, string $text, ?string $trigger, float $x, float $y) use (&$n, &$i) {
            $i++;

            return $n[$title] = $this->project->dialogueNodes()->create([
                'scene_id' => $this->scenes[$scene]->id,
                'character_id' => $char ? $this->chars[$char]->id : null,
                'node_key' => sprintf('cm_%03d', $i),
                'title' => $title,
                'dialogue_type' => $type,
                'text' => $text,
                'emotional_tone' => $tone,
                'trigger_condition' => $trigger,
                'pos_x' => $x,
                'pos_y' => $y,
            ]);
        };

        // ── Acto I
        $node('Llegada a la sala común', 'e1', 'irene', 'interactive_alternative_paths', 'calm',
            'Irene cierra el último cerrojo. La estufa crepita y la cuerda con el nombre de Dani cuelga de la viga como un reproche. «Antes de nada, necesito saber a qué nos enfrentamos.»', 'Al entrar los cuatro en el refugio.', 0, 300);
        $node('Parte meteorológico', 'e1', 'lucia', 'interactive_rubber_banding', 'anxiety',
            '«Tres días de tormenta, rachas de 140. Si el viento baja de cien, el helicóptero podría subir. Pero nadie sale ahí fuera. Nadie.»', 'Si Irene pregunta a Lucía por el tiempo.', 360, 100);
        $node('Marcos esquiva la pregunta', 'e1', 'marcos', 'interactive_alternative_paths', 'calm',
            '«Volví porque la montaña no se despide a medias, Irene.» Sonríe, pero no te mira. Su mano busca el extremo del cabo y la retira.', 'Si Irene pregunta a Marcos por qué volvió.', 360, 300);
        $node('Tomás y la cuerda de Dani', 'e1', 'tomas', 'interactive_no_branch', 'sadness',
            'Tomás recorre con el pulgar el nombre bordado. «Un año. Y todavía huele a su sudor.» No espera respuesta.', 'Si Irene se acerca a Tomás.', 360, 500);
        $node('Reparto de guardias', 'e1', 'irene', 'interactive_alternative_paths', 'anxiety',
            'Dos guardias por noche, radio abierta en la única frecuencia. Irene tiene que elegir con quién se queda despierta: la elección decide a quién vigila y a quién deja suelto.', 'Tras hablar con alguno de los tres.', 720, 300);

        // ── Acto II
        $node('Marcos vigila contigo', 'e2', 'marcos', 'interactive_rubber_banding', 'calm',
            '«Descansa, Irene. Yo me quedo con la radio.» Marcos te aparta de la sala con demasiada amabilidad: no quiere que bajes al almacén.', 'Si Irene elige la guardia con Marcos.', 1080, 150);
        $node('Tomás vigila contigo', 'e2', 'tomas', 'interactive_alternative_paths', 'sadness',
            'Tomás se ofrece a bajar al almacén por el botiquín. «Si hay algo ahí abajo, quiero verlo yo.»', 'Si Irene elige la guardia con Tomás.', 1080, 450);
        $node('El cabo cortado', 'e2', 'irene', 'cutscene', 'fear',
            'Detrás de un cajón de mosquetones, un cabo azul con la etiqueta «Cordada Dani, tramo 3». El corte es limpio, hecho con una hoja. Irene siente el frío subirle por las piernas: alguien decidió quién caía.', 'Al inspeccionar el almacén.', 1440, 300);
        $node('Tomás estalla', 'e2', 'tomas', 'interactive_alternative_paths', 'anger',
            '«¡Mi hermano se mató por una cuerda que ya estaba cortada!» Tomás avanza hacia Marcos. Irene tiene un segundo para actuar antes de que alguien haga una locura.', 'Si Irene muestra el cabo a Tomás.', 1800, 100);
        $node('El silencio de Irene', 'e2', 'irene', 'interactive_no_branch', 'guilt',
            'Guardas el cabo en la mochila. Es la segunda vez en un año que callas lo mismo. Lucía te ve hacerlo desde el pasillo.', 'Si Irene esconde el cabo.', 1800, 300);
        $node('Marcos a solas', 'e2', 'marcos', 'interactive_rubber_banding', 'anger',
            '«Alguien tenía que decidir.» No lo niega. Marcos te mira por fin, sin sonreír. «¿De verdad habrías sido capaz tú?»', 'Si Irene enfrenta a Marcos en privado.', 1800, 500);
        $node('La luz se apaga', 'e2', 'lucia', 'cutscene', 'fear',
            'Lucía se calza los crampones y sale a asegurar la antena. Un golpe seco. Se va la luz. Las respiraciones y el filo del cabo son lo único que queda en la oscuridad.', 'Al estallar la discusión en el almacén.', 2160, 300);

        // ── Acto III (los tres finales se crean antes que la confesión para poder enlazarlos con {{...}})
        $node('Confesión en la terraza', 'e3', 'marcos', 'interactive_alternative_paths', 'guilt',
            "Marcos suelta el cabo sobre la nieve. «Lo corté yo. Colgábamos los cuatro de un tramo que cedía y Dani pesaba demasiado. Corté.»\nIrene sabe que le quedan tres caminos: {{Descenso con testigos}}, {{El juicio de Tomás}} o {{Pacto de silencio}}.", 'Al amanecer, si Marcos sigue vivo y presente.', 2520, 300);
        $node('Descenso con testigos', 'e3', 'irene', 'cutscene', 'hope',
            'Bajan los cuatro por la arista con el cabo en la mochila. Marcos declarará ante la federación. Nadie se queda atrás, tampoco él. La montaña, por una vez, guarda silencio.', 'Final: justicia con compasión.', 2880, 100);
        $node('El juicio de Tomás', 'e3', 'tomas', 'cutscene', 'sadness',
            'Tomás no perdona ni condena. Dice que lo hará él, en el valle, con los ojos de Dani delante. Marcos baja atado a la cordada, con la cabeza gacha. Nadie habla en todo el descenso.', 'Final: justicia dura y doliente.', 2880, 300);
        $node('Pacto de silencio', 'e3', 'lucia', 'cutscene', 'guilt',
            'Acuerdan no decir nada. El helicóptero los baja y el cabo queda enterrado bajo la nieve. Seguirán juntos, pero ninguno volverá a mirar la cuerda de otro.', 'Final: paz falsa, culpa compartida.', 2880, 500);

        // Opciones manuales (con consecuencias y condiciones; nunca las toca la sincronización de referencias).
        $opt = function (string $from, string $text, ?string $to, ?string $consequence = null, ?string $condition = null) use (&$n) {
            $n[$from]->options()->create([
                'next_dialogue_node_id' => $to ? $n[$to]->id : null,
                'player_option' => $text, 'consequence' => $consequence, 'required_condition' => $condition,
            ]);
        };

        $opt('Llegada a la sala común', 'Pedir a Lucía el parte meteorológico', 'Parte meteorológico', 'Desbloquea la ventana de calma del tercer amanecer.');
        $opt('Llegada a la sala común', 'Preguntar a Marcos por qué ha vuelto este año', 'Marcos esquiva la pregunta', 'Marcos se pone a la defensiva.');
        $opt('Llegada a la sala común', 'Dejar a Tomás a solas con su duelo', 'Tomás y la cuerda de Dani', 'Tomás confía algo más en ti.');
        $opt('Parte meteorológico', 'Anotar la ventana de calma y seguir', 'Reparto de guardias', 'Se anota la ventana de rescate para el desenlace.');
        $opt('Marcos esquiva la pregunta', 'Presionar: «¿Qué le pasó a la cuerda?»', 'Reparto de guardias', 'Confianza de Marcos −1.');
        $opt('Marcos esquiva la pregunta', 'Dejarlo estar por ahora', 'Reparto de guardias', 'Confianza de Marcos +1.');
        $opt('Tomás y la cuerda de Dani', 'Sentarte a su lado en silencio', 'Reparto de guardias', 'Confianza de Tomás +1.');
        $opt('Reparto de guardias', 'Hacer la primera guardia con Marcos', 'Marcos vigila contigo', 'Vigilas a Marcos, pero Tomás queda libre para rondar el almacén.');
        $opt('Reparto de guardias', 'Hacer la primera guardia con Tomás', 'Tomás vigila contigo', 'Tomás baja contigo al almacén y ve el cabo a la vez que tú.');
        $opt('Reparto de guardias', 'Hacer la guardia sola', 'El cabo cortado', 'Descubres el cabo antes que nadie, sin testigos.', 'Confianza de cordada ≥ 2');
        $opt('Marcos vigila contigo', 'Bajar al almacén de todas formas', 'El cabo cortado', 'Marcos sospecha de ti.');
        $opt('Tomás vigila contigo', 'Bajar al almacén con él', 'El cabo cortado', 'Tomás ve el cabo en tus manos.');
        $opt('El cabo cortado', 'Mostrar el cabo a Tomás', 'Tomás estalla', 'Tomás pierde el control; Marcos queda acorralado.');
        $opt('El cabo cortado', 'Esconder el cabo y esperar', 'El silencio de Irene', 'Ganas tiempo, pero Lucía te ve esconderlo.');
        $opt('El cabo cortado', 'Enfrentar a Marcos a solas', 'Marcos a solas', 'Abres la vía de la confesión privada.');
        $opt('Tomás estalla', 'Contener a Tomás y exigir calma', 'La luz se apaga', 'Tomás confía en ti; Marcos queda a la defensiva.');
        $opt('Tomás estalla', 'Dejar que Tomás se enfrente a Marcos', 'La luz se apaga', 'Marcos queda herido; Tomás se acerca a un punto sin retorno.');
        // Opción rota a propósito: contradice la regla «Nadie se queda atrás» y el inspector la marca como error.
        $opt('Tomás estalla', 'Dejar a Marcos fuera, en la tormenta', null, 'Rompe «Nadie se queda atrás»: pierdes el aval del macizo. (Destino sin escribir.)', 'Confianza de cordada ≤ 1');
        $opt('El silencio de Irene', 'Seguir adelante con el secreto', 'La luz se apaga', 'Confianza de Lucía −2.');
        $opt('Marcos a solas', 'Exigirle que lo confiese ante todos', 'La luz se apaga', 'Marcos acepta confesar al amanecer.');
        $opt('La luz se apaga', 'Salir a buscar a Lucía', 'Confesión en la terraza', 'Gastas horas de generador; arriesgas a Irene en la tormenta.');
        $opt('La luz se apaga', 'Esperar a que Lucía vuelva', 'Confesión en la terraza', 'Lucía regresa herida; pierdes confianza.');

        // Referencias {{Título}}: crea las opciones administradas hacia los tres finales (ya existen, no se crean nodos nuevos).
        app(ReferenceSyncService::class)->sync($n['Confesión en la terraza']);
        $managed = [
            'Descenso con testigos' => 'Marcos es entregado a la federación. Final de justicia con compasión.',
            'El juicio de Tomás' => 'Tomás decide el castigo en el valle. Final duro y doliente.',
            'Pacto de silencio' => 'Todos callan. Final de paz falsa: la culpa queda sin resolver.',
        ];
        foreach ($managed as $title => $consequence) {
            $n['Confesión en la terraza']->options()->where('source_ref', Str::lower($title))->update(['consequence' => $consequence]);
        }
    }

    // ───────────────────────── Costes y comentarios ─────────────────────────

    private function createCosts(): void
    {
        $estimator = app(NarrativeCostEstimatorService::class);

        foreach ($this->scenes as $scene) {
            $estimator->createFor($this->project, $scene);
        }
        foreach ($this->project->dialogueNodes()->get() as $dialogue) {
            $estimator->createFor($this->project, $dialogue);
        }
    }

    private function createComments(): void
    {
        $comments = [
            ['e1', 'La línea de Irene sobre seguir sin el que se retrase suena a otra persona. Revisar con la regla «Nadie se queda atrás».'],
            ['e2', 'Me encanta el cabo azul como prueba física. Ojo con que Lucía salga a la tormenta: la ficha dice que le aterra el exterior.'],
            ['e2', 'Falta decidir si Tomás atiende o no la mano de Marcos. El juramento del médico dice que sí.'],
            ['e3', 'El perdón inmediato de Tomás se siente apresurado. Pendiente de plantear una alternativa con la IA.'],
            [null, 'Idea para otro final: Irene baja sola con el cabo y deja la decisión a la federación. Pendiente de valorar con el equipo.'],
        ];

        foreach ($comments as [$scene, $text]) {
            $this->project->comments()->create([
                'scene_id' => $scene ? $this->scenes[$scene]->id : null,
                'user_id' => $this->user->id,
                'text' => $text,
            ]);
        }
    }

    // ─────────────────────── Análisis emocional (sin red) ───────────────────────

    private function createEmotionalAnalyses(): void
    {
        $realSource = app(EmotionAnalyzer::class)->source();
        $model = $realSource === 'groq' ? (string) config('services.groq.model') : null;
        $data = new CumbreMudaAnalyses(collect($this->chars)->map->id->all());
        $bySceneId = [];
        foreach ($this->scenes as $key => $scene) {
            $bySceneId[$scene->id] = $data->forScene($key);
        }

        // Analizador con resultados de autor: mismo contrato que Groq o palabras clave, sin red.
        $analyzer = new class($bySceneId, $realSource, $model) implements EmotionAnalyzer
        {
            public function __construct(
                private readonly array $bySceneId,
                private readonly string $source,
                private readonly ?string $model,
            ) {}

            public function analyzeScene(Scene $scene): SceneEmotionResult
            {
                $data = $this->bySceneId[$scene->id];

                return new SceneEmotionResult(
                    scene: $data['scene'],
                    characters: $data['characters'],
                    inconsistencies: $data['inconsistencies'],
                    suggestions: $data['suggestions'],
                    source: $this->source,
                    model: $this->model,
                );
            }

            public function source(): string
            {
                return $this->source;
            }
        };

        $service = new SceneEmotionService(
            $analyzer,
            app(SceneContextBuilder::class),
            app(EmotionChangeDetector::class),
            app(EmotionTranslator::class),
            app(ScenePlainText::class),
        );

        // En orden de guion: cada escena toma como estado previo el de la anterior.
        foreach (['e1', 'e2', 'e3'] as $key) {
            $service->analyze($this->scenes[$key]->refresh(), force: true);
        }
    }

    private function createFeedback(): void
    {
        // Valoraciones 👍/👎 del autor sobre las sugerencias (alimentan gamerdust:ai-metrics).
        $votes = [
            'e1' => [0 => true, 1 => true, 2 => false],
            'e2' => [0 => true, 1 => true, 2 => true],
            'e3' => [0 => true, 1 => false, 2 => true],
        ];

        foreach ($votes as $key => $items) {
            $analysis = EmotionalAnalysis::query()
                ->where('analyzable_type', Scene::class)
                ->where('analyzable_id', $this->scenes[$key]->id)
                ->latest('id')->first();

            foreach ($items as $index => $useful) {
                AiFeedback::create([
                    'project_id' => $this->project->id,
                    'user_id' => $this->user->id,
                    'emotional_analysis_id' => $analysis->id,
                    'item_index' => $index,
                    'useful' => $useful,
                ]);
            }
        }
    }
}
