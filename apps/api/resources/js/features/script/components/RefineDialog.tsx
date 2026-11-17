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
    onApply: (text: string) => void;
    onClose: () => void;
}

/**
 * Refinar un bloque del guion con IA: la propuesta se compara con el original y solo
 * "Aplicar" la lleva al borrador local (entra en deshacer/rehacer). Se guarda al pulsar Guardar.
 */
export default function RefineDialog({ projectId, sceneId, block, blockLabel, characters, catalog, onApply, onClose }: RefineDialogProps) {
    const [goal, setGoal] = useState<Goal>('more_tension');
    const [characterId, setCharacterId] = useState<number | ''>(characters[0]?.id ?? '');
    const [instruction, setInstruction] = useState('');
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
            <p className="mb-2 text-[10px] text-[#a2b697]">{__('Block to refine: :kind', { kind: blockLabel })}</p>
            <p className="mb-5 whitespace-pre-wrap rounded-md border border-border bg-background p-3 font-mono text-[11px] leading-6 text-[#c2cfb8]">{block.text}</p>

            <fieldset disabled={pending}>
                <legend className="mb-2 text-xs">{__('What do you want to achieve?')}</legend>
                <div className="flex flex-wrap gap-2">
                    {GOALS.map(({ key, label }) => (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={goal === key}
                            onClick={() => setGoal(key)}
                            className={`min-h-9 rounded-full border px-3 text-[11px] transition ${goal === key ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-[#b4c4a8] hover:border-primary/30'}`}
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
                    <input value={instruction} maxLength={300} onChange={(event) => setInstruction(event.target.value)} placeholder={__('E.g. Keep the reference to the lighthouse')} className={field} />
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
                            <p className="mb-1.5 text-[10px] text-[#a2b697]">{__('Original')}</p>
                            <p className="h-full whitespace-pre-wrap rounded-md border border-border p-3 font-mono text-[11px] leading-6 text-[#aebea3]">{block.text}</p>
                        </div>
                        <div>
                            <p className="mb-1.5 text-[10px] text-primary">{__('Proposal')}</p>
                            <p className="h-full whitespace-pre-wrap rounded-md border border-primary/35 bg-primary/5 p-3 font-mono text-[11px] leading-6 text-[#dce6d5]">{result.proposal}</p>
                        </div>
                    </div>

                    {result.changes.length > 0 && (
                        <ul className="list-disc space-y-1 pl-5 text-[11px] leading-5 text-[#c3d0b9]">
                            {result.changes.map((change, index) => (
                                <li key={index}>{change}</li>
                            ))}
                        </ul>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="flex items-center gap-2 text-[10px] text-[#a2b697]">
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
                        <button type="button" disabled={pending} onClick={() => onApply(result.proposal)} className={primarySm}>
                            <Check size={14} /> {__('Apply')}
                        </button>
                    </div>
                    <p className="text-[10px] text-[#93a886]">{__('Apply only changes your draft (you can undo it). Press Save to keep it.')}</p>
                </div>
            )}
        </Modal>
    );
}
