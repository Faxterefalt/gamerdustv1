import { Check, RefreshCw, Wand2, X } from 'lucide-react';
import { useState } from 'react';
import Modal, { FormError, Pending } from '../../../shared/components/ui';
import { api, ApiError } from '../../../shared/lib/api';
import { __ } from '../../../shared/lib/i18n';
import { field, primarySm, secondary } from '../../../shared/lib/styles';
import { EmotionChip } from '../../analysis/components/EmotionBits';
import FeedbackButtons from '../../analysis/components/FeedbackButtons';
import type { EmotionCatalog } from '../../analysis/emotion.types';
import type { NamedReference, ScriptBlock } from '../script.types';

type Goal = 'more_tension' | 'more_hope' | 'clearer' | 'more_concise' | 'true_to_character';

// Claves de traducción de los objetivos.
const GOALS: { key: Goal; label: string }[] = [
    { key: 'more_tension', label: 'More tension' },
    { key: 'more_hope', label: 'More hope' },
    { key: 'clearer', label: 'Clearer' },
    { key: 'more_concise', label: 'More concise' },
    { key: 'true_to_character', label: "True to a character's personality" },
];

interface Proposal {
    proposal: string;
    changes: string[];
    resulting_emotion: string;
    generation_id: number | null;
}

interface RefineDialogProps {
    projectId: number;
    sceneId: number;
    block: ScriptBlock;
    blockLabel: string;
    /** Personajes vinculados a la escena (para "fiel a la personalidad de…"). */
    characters: NamedReference[];
    catalog: EmotionCatalog;
    /** "Usar como base": la sugerencia del análisis llega como instrucción (editable). */
    initialInstruction?: string;
    /** Bloques que se pueden elegir para refinar (desde una sugerencia, que es de toda la escena). */
    choices?: ScriptBlock[];
    onApply: (text: string, blockId: string) => void;
    onClose: () => void;
}

/**
 * Refinar un bloque del guion con IA: la propuesta se compara con el original y solo
 * "Aplicar" la lleva al borrador local (entra en deshacer/rehacer). Se guarda al pulsar Guardar.
 */
export default function RefineDialog({ projectId, sceneId, block: initialBlock, blockLabel, characters, catalog, initialInstruction = '', choices, onApply, onClose }: RefineDialogProps) {
    const [block, setBlock] = useState(initialBlock);
    const [goal, setGoal] = useState<Goal>(initialInstruction ? 'clearer' : 'more_tension');
    const [characterId, setCharacterId] = useState<number | ''>(characters[0]?.id ?? '');
    const [instruction, setInstruction] = useState(initialInstruction);
    const [result, setResult] = useState<Proposal | null>(null);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');

    const needsCharacter = goal === 'true_to_character';
    const character = characters.find((item) => item.id === characterId);

    function generate() {
        setPending(true);
        setError('');

        api<Proposal>('POST', `/projects/${projectId}/script/scenes/${sceneId}/refine`, {
            block,
            goal,
            character_id: needsCharacter ? characterId || null : null,
            instruction: instruction.trim() || null,
        })
            .then(setResult)
            .catch((caught: unknown) => {
                if (caught instanceof ApiError) {
                    setError(caught.status === 429 ? __('AI is busy, try again in a minute') : (Object.values(caught.errors)[0]?.[0] ?? caught.message));
                } else {
                    setError(__('AI is busy, try again in a minute'));
                }
            })
            .finally(() => setPending(false));
    }

    return (
        <Modal title={__('Refine with AI')} wide onClose={() => !pending && onClose()}>
            {choices && choices.length > 1 ? (
                <label className="mb-2 block text-xs text-muted">
                    {__('Block to refine')}
                    <select
                        value={block.id}
                        disabled={pending}
                        onChange={(event) => {
                            setBlock(choices.find((choice) => choice.id === event.target.value) ?? block);
                            setResult(null);
                        }}
                        className={field}
                    >
                        {choices.map((choice, index) => (
                            <option key={choice.id} value={choice.id}>
                                {`${index + 1}. ${choice.text.slice(0, 70)}${choice.text.length > 70 ? '…' : ''}`}
                            </option>
                        ))}
                    </select>
                </label>
            ) : (
                <p className="mb-2 text-xs text-muted">{__('Block to refine: :kind', { kind: blockLabel })}</p>
            )}
            <p className="mb-5 whitespace-pre-wrap rounded-md border border-border bg-background p-3 font-mono text-xs leading-6 text-muted">{block.text}</p>

            <fieldset disabled={pending}>
                <legend className="mb-2 text-xs">{__('What do you want to achieve?')}</legend>
                <div className="flex flex-wrap gap-2">
                    {GOALS.map(({ key, label }) => (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={goal === key}
                            onClick={() => setGoal(key)}
                            className={`min-h-9 rounded-full border px-3 text-xs transition ${goal === key ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted hover:border-primary/30'}`}
                        >
                            {key === 'true_to_character' && character ? __("True to :character's personality", { character: character.name }) : __(label)}
                        </button>
                    ))}
                </div>

                {needsCharacter && (
                    <label className="mt-4 block text-xs">
                        {__('Character')}
                        <select value={characterId} onChange={(event) => setCharacterId(event.target.value ? Number(event.target.value) : '')} className={field}>
                            {!characters.length && <option value="">{__('Link characters to this scene first')}</option>}
                            {characters.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                <label className="mt-4 block text-xs">
                    {__('Extra instruction (optional)')}
                    {initialInstruction ? (
                        <textarea value={instruction} maxLength={700} rows={3} onChange={(event) => setInstruction(event.target.value)} className={field} />
                    ) : (
                        <input value={instruction} maxLength={700} onChange={(event) => setInstruction(event.target.value)} placeholder={__('E.g. Keep the reference to the lighthouse')} className={field} />
                    )}
                </label>
            </fieldset>

            <FormError error={error} />

            {!result && (
                <button type="button" disabled={pending || (needsCharacter && !characterId)} onClick={generate} className={`${primarySm} mt-5 w-full`}>
                    <Pending pending={pending}>
                        <Wand2 size={14} /> {__('Generate proposal')}
                    </Pending>
                </button>
            )}

            {result && (
                <div className="mt-6 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <p className="mb-1.5 text-xs text-muted">{__('Original')}</p>
                            <p className="h-full whitespace-pre-wrap rounded-md border border-border p-3 font-mono text-xs leading-6 text-muted">{block.text}</p>
                        </div>
                        <div>
                            <p className="mb-1.5 text-xs text-primary">{__('Proposal')}</p>
                            <p className="h-full whitespace-pre-wrap rounded-md border border-primary/35 bg-primary/5 p-3 font-mono text-xs leading-6 text-foreground">{result.proposal}</p>
                        </div>
                    </div>

                    {result.changes.length > 0 && (
                        <ul className="list-disc space-y-1 pl-5 text-xs leading-5 text-muted">
                            {result.changes.map((change, index) => (
                                <li key={index}>{change}</li>
                            ))}
                        </ul>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="flex items-center gap-2 text-xs text-muted">
                            {__('Resulting emotion')} <EmotionChip emotion={result.resulting_emotion} catalog={catalog} size="sm" />
                        </p>
                        {result.generation_id && <FeedbackButtons key={result.generation_id} projectId={projectId} target={{ ai_generation_id: result.generation_id }} />}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                        <button type="button" disabled={pending} onClick={onClose} className={secondary}>
                            <X size={14} /> {__('Discard')}
                        </button>
                        <button type="button" disabled={pending} onClick={generate} className={secondary}>
                            <Pending pending={pending}>
                                <RefreshCw size={14} /> {__('Try another')}
                            </Pending>
                        </button>
                        <button type="button" disabled={pending} onClick={() => onApply(result.proposal, block.id)} className={primarySm}>
                            <Check size={14} /> {__('Apply')}
                        </button>
                    </div>
                    <p className="text-xs text-subtle">{__('Apply only changes your draft (you can undo it). Press Save to keep it.')}</p>
                </div>
            )}
        </Modal>
    );
}
