<?php

namespace App\Services\Assist;

use App\Models\Character;
use App\Models\Scene;
use App\Services\Ai\AiUnavailableException;
use App\Services\Ai\GroqClient;
use App\Services\Emotion\EmotionTranslator;
use App\Services\Emotion\SceneContextBuilder;
use App\Services\Emotion\ScenePrompt;
use App\Services\Script\ScenePlainText;
use Illuminate\Support\Str;

/**
 * "Refinar": propuesta alternativa para un bloque del guion. No toca la BD (solo registra la
 * llamada en ai_generations): el autor la aplica a su borrador local y la guarda como siempre.
 */
class BlockRefineService
{
    public const SCHEMA_NAME = 'script_block_refinement';

    public const GOALS = ['more_tension', 'more_hope', 'clearer', 'more_concise', 'true_to_character'];

    private const GOAL_TEXT = [
        'more_tension' => 'aumentar la tensión dramática',
        'more_hope' => 'aportar más esperanza',
        'clearer' => 'hacerlo más claro y fácil de seguir',
        'more_concise' => 'hacerlo más conciso',
        'true_to_character' => 'que sea más fiel a la personalidad de :character',
    ];

    private const KINDS = [
        'heading' => 'encabezado de escena',
        'action' => 'acción',
        'character' => 'nombre de personaje',
        'dialogue' => 'diálogo',
        'parenthetical' => 'acotación',
    ];

    /** Palabras de la escena que acompañan al bloque como contexto. */
    private const SCENE_WORDS = 600;

    public function __construct(
        private readonly GroqClient $groq,
        private readonly SceneContextBuilder $contexts,
        private readonly ScenePrompt $prompt,
        private readonly EmotionTranslator $translator,
        private readonly ScenePlainText $text,
    ) {}

    /**
     * @param  array{id: string, kind: string, text: string}  $block
     * @return array{proposal: string, changes: list<string>, resulting_emotion: string, generation_id: int|null}
     *
     * @throws AiUnavailableException
     */
    public function refine(Scene $scene, array $block, string $goal, ?Character $character, ?string $instruction, int $userId): array
    {
        $context = $this->contexts->build($scene);

        $response = $this->groq->chatJson(
            $this->system($context, $block, $goal, $character, $instruction),
            $this->user($context, $scene, $block),
            $this->schema(),
            self::SCHEMA_NAME,
            log: ['project_id' => $scene->project_id, 'user_id' => $userId, 'type' => 'refine'],
        );

        $proposal = is_string($response->data['proposal'] ?? null) ? Str::limit(trim($response->data['proposal']), 10000, '') : '';

        if ($proposal === '') {
            throw new AiUnavailableException('invalid_output', generationId: $response->generationId);
        }

        $emotion = $response->data['resulting_emotion'] ?? null;

        return [
            'proposal' => $proposal,
            'changes' => array_slice(array_values(array_filter(array_map(
                fn (mixed $change) => is_string($change) ? Str::limit(trim($change), 300) : '',
                is_array($response->data['changes'] ?? null) ? $response->data['changes'] : [],
            ))), 0, 4),
            'resulting_emotion' => is_string($emotion) && $this->translator->isEmotion($emotion) ? $emotion : 'neutral',
            'generation_id' => $response->generationId,
        ];
    }

    private function system(array $context, array $block, string $goal, ?Character $character, ?string $instruction): string
    {
        $kind = self::KINDS[$block['kind']] ?? $block['kind'];
        $narrative = $this->prompt->language($context['project']['language']);
        $interface = $this->prompt->language(app()->getLocale());
        $emotions = implode(', ', $this->translator->keys());
        $objective = str_replace(':character', $character?->name ?? 'el personaje', self::GOAL_TEXT[$goal]);
        $extra = filled($instruction) ? "\nIndicación del autor: ".Str::limit(trim($instruction), 300) : '';

        return <<<PROMPT
        Eres un asistente de escritura de guiones para videojuegos. Propones una versión alternativa
        de UN bloque del guion; el autor decide si la usa. Nunca reescribes el resto de la escena.

        Objetivo: {$objective}.{$extra}

        Reglas:
        1. "proposal" contiene solo el nuevo texto del bloque, del mismo tipo ({$kind}) y en el
           idioma de la narrativa ({$narrative}). Sin comillas, etiquetas ni nombre del personaje.
        2. Respeta la personalidad, motivación y miedos de los personajes, el lugar y las reglas del mundo.
        3. Mantén una extensión parecida, salvo que el objetivo sea hacerlo más conciso.
        4. "changes": de 1 a 4 frases breves en {$interface} que expliquen qué cambiaste y por qué.
        5. "resulting_emotion": la emoción dominante del bloque propuesto, una de: {$emotions}.
        PROMPT;
    }

    private function user(array $context, Scene $scene, array $block): string
    {
        $lines = $this->prompt->contextLines($context);
        [$sceneText] = $this->text->limit($context['scene']['text'], self::SCENE_WORDS);
        $speaker = $this->speakerOf($scene, $block['id']);

        $lines[] = '';
        $lines[] = "ESCENA {$context['scene']['code']} \"{$context['scene']['title']}\" (versión guardada, solo como contexto):";
        $lines[] = $sceneText;
        $lines[] = '';
        $lines[] = 'BLOQUE A REFINAR ('.(self::KINDS[$block['kind']] ?? $block['kind']).($speaker ? ", lo dice {$speaker}" : '').'):';
        $lines[] = trim($block['text']);

        return implode("\n", $lines);
    }

    /**
     * Quién habla en un diálogo o acotación: el último bloque de personaje anterior en el guion guardado.
     */
    private function speakerOf(Scene $scene, string $blockId): ?string
    {
        $speaker = null;

        foreach ($scene->script ?? [] as $item) {
            if (($item['id'] ?? null) === $blockId) {
                return in_array($item['kind'] ?? null, ['dialogue', 'parenthetical'], true) ? $speaker : null;
            }

            if (($item['kind'] ?? null) === 'character') {
                $speaker = trim((string) ($item['text'] ?? '')) ?: null;
            } elseif (($item['kind'] ?? null) !== 'dialogue' && ($item['kind'] ?? null) !== 'parenthetical') {
                $speaker = null;
            }
        }

        return null;
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['proposal', 'changes', 'resulting_emotion'],
            'properties' => [
                'proposal' => ['type' => 'string'],
                'changes' => ['type' => 'array', 'items' => ['type' => 'string']],
                'resulting_emotion' => ['type' => 'string', 'enum' => $this->translator->keys()],
            ],
        ];
    }
}
