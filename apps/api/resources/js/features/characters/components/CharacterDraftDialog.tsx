import { Wand2 } from 'lucide-react';
import { useState } from 'react';
import Modal, { FormError, Pending } from '../../../shared/components/ui';
import { api, ApiError } from '../../../shared/lib/api';
import { __ } from '../../../shared/lib/i18n';
import { field, primarySm } from '../../../shared/lib/styles';
import type { Character } from '../characters.types';

/** Borrador que propone la IA: campos de `characters` (sin guardar). */
export type CharacterDraft = Required<Omit<Character, 'id' | 'project_id'>>;

export interface CharacterDraftResult {
    draft: CharacterDraft;
    duplicate_name: boolean;
    generation_id: number | null;
}

interface CharacterDraftDialogProps {
    projectId: number;
    onDraft: (result: CharacterDraftResult) => void;
    onClose: () => void;
}

/**
 * "Generar": a partir de una idea breve, la IA propone un borrador de ficha que rellena el
 * formulario sin guardarlo. El autor revisa y pulsa Guardar ficha como siempre.
 */
export default function CharacterDraftDialog({ projectId, onDraft, onClose }: CharacterDraftDialogProps) {
    const [idea, setIdea] = useState('');
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');

    function generate() {
        setPending(true);
        setError('');

        api<CharacterDraftResult>('POST', `/projects/${projectId}/ai/character-draft`, { idea })
            .then(onDraft)
            .catch((caught: unknown) => {
                if (caught instanceof ApiError && caught.status === 422) {
                    setError(Object.values(caught.errors)[0]?.[0] ?? caught.message);
                } else if (caught instanceof ApiError && caught.status === 503) {
                    setError(caught.message);
                } else {
                    setError(__('AI is busy, try again in a minute'));
                }
            })
            .finally(() => setPending(false));
    }

    return (
        <Modal title={__('Character draft with AI')} onClose={() => !pending && onClose()}>
            <p className="mb-4 text-xs leading-6 text-[#a6b99a]">
                {__('Describe your idea in a sentence. The AI proposes a draft consistent with your Bible; nothing is saved until you press Save sheet.')}
            </p>
            <label className="block text-xs">
                {__('Your idea')}
                <textarea
                    rows={3}
                    maxLength={500}
                    value={idea}
                    disabled={pending}
                    onChange={(event) => setIdea(event.target.value)}
                    placeholder={__('E.g. A retired smuggler who now guards the lighthouse and fears the sea at night.')}
                    className={`${field} resize-y leading-6`}
                />
            </label>
            <FormError error={error} />
            <button type="button" disabled={pending || idea.trim().length < 3} onClick={generate} className={`${primarySm} mt-5 w-full`}>
                <Pending pending={pending}>
                    <Wand2 size={14} /> {__('Generate draft')}
                </Pending>
            </button>
        </Modal>
    );
}
