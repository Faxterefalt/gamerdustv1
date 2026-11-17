<?php

namespace App\Services\Emotion;

/**
 * Prompt y esquema JSON (strict) del análisis emocional de escena con Groq.
 * El texto que va al modelo no es interfaz: no pasa por __().
 */
class ScenePrompt
{
    public const SCHEMA_NAME = 'scene_emotion_analysis';

    private const LANGUAGES = ['es' => 'español', 'en' => 'inglés (English)'];

    private const RIGIDITY = ['unbreakable' => 'inquebrantable', 'costly' => 'se puede romper con un coste', 'flexible' => 'flexible'];

    private const RULE_ROLES = ['breaks' => 'rompe', 'enforces' => 'impone'];

    public function __construct(private readonly EmotionTranslator $translator) {}

    public function system(array $context): string
    {
        $emotions = implode(', ', $this->translator->keys());
        $narrative = $this->language($context['project']['language']);
        $interface = $this->language(app()->getLocale());

        return <<<PROMPT
        Eres un asistente de diseño narrativo para videojuegos. Tu trabajo es LEER y EVALUAR;
        nunca reescribes la historia ni decides por el autor.

        Dimensiones (0 a 1):
        - v (valencia): 0 muy desagradable/negativo · 0.5 neutro · 1 muy agradable/positivo.
        - a (activación): 0 calma total · 0.5 moderado · 1 máxima tensión o excitación.
        - d (dominancia): 0 sin control, a merced · 1 domina la situación.
        "emotion" debe ser exactamente una de: {$emotions}.

        Reglas:
        1. Basa cada valor en el texto. "evidence" es una cita breve y LITERAL de la escena
           (máx. 15 palabras), en el idioma original de la escena ({$narrative}).
        2. Analiza solo a los personajes de la lista PERSONAJES que actúan o hablan en la escena,
           con su character_id exacto. No inventes personajes.
        3. "out_of_character" = true solo si una acción o diálogo contradice claramente la
           personalidad, motivación o miedos de su ficha; explica en "out_of_character_reason"
           (cadena vacía si es false).
        4. Compara cada personaje con su ESTADO PREVIO: en "change_explanation" di qué ocurre en
           la escena que explica el cambio; "change_justified" = true si el texto muestra una
           causa clara (o si casi no hubo cambio o no hay estado previo).
        5. "inconsistencies": solo contradicciones reales con el LUGAR, las REGLAS DEL MUNDO
           (ten en cuenta su rigidez) o la esencia del proyecto. En "contradicts" escribe el
           nombre exacto de la ficha contradicha. Si no hay, lista vacía.
        6. "suggestions": de 1 a 3, concretas, como propuestas descartables. Nunca devuelvas la
           escena reescrita.
        7. Escribe "summary", explicaciones y sugerencias en {$interface}, en lenguaje claro,
           sin mencionar valencia, activación, dominancia ni VAD.
        8. Si el texto es muy breve o ambiguo, usa "neutral" con valores cercanos a 0.5 y dilo
           en "summary".
        9. En "scene", compara el tono con la ESCENA ANTERIOR: "change_justified" = true si el
           texto explica el salto (o si no hay escena anterior) y "change_explanation" lo resume.
        PROMPT;
    }

    public function user(array $context): string
    {
        $lines = $this->contextLines($context);

        $lines[] = '';
        $lines[] = 'ESTADO PREVIO:';
        foreach ($context['characters'] as $character) {
            $previous = $context['previous'][$character['id']] ?? ['origin' => 'none'];
            $lines[] = "- [character_id:{$character['id']}] {$character['name']}: ".match ($previous['origin']) {
                'none' => 'sin estado previo · origen: none',
                default => "{$previous['emotion']} ({$this->vad($previous)}) · origen: {$previous['origin']}".($previous['code'] ? " en {$previous['code']}" : ''),
            };
        }

        $previousScene = $context['previous_scene'];
        $lines[] = '';
        $lines[] = $previousScene
            ? "ESCENA ANTERIOR: {$previousScene['code']} \"{$previousScene['title']}\": {$previousScene['emotion']} ({$this->vad($previousScene)})"
            : 'ESCENA ANTERIOR: ninguna analizada';

        $scene = $context['scene'];
        $lines[] = '';
        $lines[] = "ESCENA {$scene['code']} · Acto ".($scene['act'] ?: '—').": \"{$scene['title']}\"".($scene['truncated'] ? ' (texto recortado)' : '');
        $lines[] = $scene['text'];

        return implode("\n", $lines);
    }

    /**
     * Contexto común (proyecto, esencia, lugar, reglas y personajes) para cualquier petición sobre una escena.
     *
     * @return list<string>
     */
    public function contextLines(array $context): array
    {
        $project = $context['project'];
        $lines = [
            "PROYECTO: {$project['title']} · Género: ".($project['genre'] ?: '—').' · Idioma de la narrativa: '.$this->language($project['language']),
        ];

        $essence = $project['essence'];
        if ($essence) {
            $labels = ['premise' => 'Premisa', 'central_conflict' => 'Conflicto principal', 'central_theme' => 'Tema', 'tone' => 'Tono', 'setting' => 'Ambientación'];
            $lines[] = 'ESENCIA: '.implode(' / ', array_map(fn ($key, $value) => "{$labels[$key]}: {$value}", array_keys($essence), $essence));
        }

        $lines[] = '';
        $location = $context['location'];
        $lines[] = $location ? "LUGAR: \"{$location['title']}\"".($location['description'] ? " — {$location['description']}" : '') : 'LUGAR: sin lugar asignado';

        $lines[] = 'REGLAS DEL MUNDO:';
        foreach ($context['rules'] as $rule) {
            $rigidity = self::RIGIDITY[$rule['rigidity']] ?? 'sin rigidez definida';
            $lines[] = "- \"{$rule['title']}\" ({$rigidity}): ".($rule['statement'] ?? '—');
        }
        if (! $context['rules']) {
            $lines[] = '- ninguna vinculada';
        }

        $lines[] = '';
        $lines[] = 'PERSONAJES:';
        foreach ($context['characters'] as $character) {
            $lines[] = "- [character_id:{$character['id']}] {$character['name']}".($character['role'] ? " ({$character['role']})" : '').': '.($character['description'] ?? '—');
            $traits = array_filter([
                'Personalidad' => $character['personality'],
                'Motivación' => $character['motivation'],
                'Miedos' => $character['fear'],
                'Límites' => $character['limits'],
                'Reglas' => implode('; ', array_map(
                    fn (array $rule) => (self::RULE_ROLES[$rule['role']] ?? 'vinculada a')." \"{$rule['title']}\"",
                    $character['rules'],
                )),
            ], 'filled');
            if ($traits) {
                $lines[] = '  '.implode(' | ', array_map(fn ($key, $value) => "$key: $value", array_keys($traits), $traits));
            }
        }
        if (! $context['characters']) {
            $lines[] = '- ninguno vinculado (devuelve "characters" vacío)';
        }

        return $lines;
    }

    /**
     * Esquema strict: todas las propiedades en required y additionalProperties false.
     * Sin minimum/maximum: el rango se valida en PHP.
     */
    public function schema(): array
    {
        $emotion = ['type' => 'string', 'enum' => $this->translator->keys()];
        $object = fn (array $properties) => [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => array_keys($properties),
            'properties' => $properties,
        ];
        $string = ['type' => 'string'];
        $number = ['type' => 'number'];
        $boolean = ['type' => 'boolean'];

        return $object([
            'scene' => $object([
                'v' => $number, 'a' => $number, 'd' => $number,
                'emotion' => $emotion,
                'summary' => $string,
                'evidence' => $string,
                'change_justified' => $boolean,
                'change_explanation' => $string,
            ]),
            'characters' => ['type' => 'array', 'items' => $object([
                'character_id' => ['type' => 'integer'],
                'name' => $string,
                'v' => $number, 'a' => $number, 'd' => $number,
                'emotion' => $emotion,
                'evidence' => $string,
                'out_of_character' => $boolean,
                'out_of_character_reason' => $string,
                'change_justified' => $boolean,
                'change_explanation' => $string,
            ])],
            'inconsistencies' => ['type' => 'array', 'items' => $object([
                'fragment' => $string,
                'contradicts' => $string,
                'explanation' => $string,
                'severity' => ['type' => 'string', 'enum' => ['low', 'medium', 'high']],
            ])],
            'suggestions' => ['type' => 'array', 'items' => $object([
                'kind' => ['type' => 'string', 'enum' => ['emotion', 'coherence', 'pacing', 'conflict']],
                'text' => $string,
                'why' => $string,
            ])],
        ]);
    }

    public function language(?string $code): string
    {
        return self::LANGUAGES[$code] ?? (string) $code;
    }

    private function vad(array $state): string
    {
        return sprintf('v=%.2f, a=%.2f, d=%.2f', $state['v'], $state['a'], $state['d']);
    }
}
