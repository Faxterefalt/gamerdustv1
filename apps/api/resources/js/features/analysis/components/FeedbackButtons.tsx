import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../../shared/lib/api';
import { __ } from '../../../shared/lib/i18n';

/** A qué propuesta se refiere el voto: sugerencia de un análisis o una generación. */
export type FeedbackTarget = { emotional_analysis_id: number } | { ai_generation_id: number };

interface FeedbackButtonsProps {
    projectId: number;
    target: FeedbackTarget;
    index?: number;
    initial?: boolean | null;
}

/**
 * 👍/👎 sobre una propuesta de la IA (evaluación del OE4). Pulsar de nuevo cambia el voto.
 */
export default function FeedbackButtons({ projectId, target, index = 0, initial = null }: FeedbackButtonsProps) {
    const [vote, setVote] = useState<boolean | null>(initial);
    const [pending, setPending] = useState(false);

    function send(useful: boolean) {
        const previous = vote;
        setVote(useful);
        setPending(true);

        api('POST', `/projects/${projectId}/ai/feedback`, { ...target, item_index: index, useful })
            .catch(() => setVote(previous))
            .finally(() => setPending(false));
    }

    const base = 'inline-flex h-8 w-8 items-center justify-center rounded-md border transition disabled:opacity-50';

    return (
        <span className="inline-flex items-center gap-1.5" role="group" aria-label={__('Was this useful?')}>
            <button
                type="button"
                disabled={pending}
                aria-pressed={vote === true}
                aria-label={__('Useful')}
                title={__('Useful')}
                onClick={() => send(true)}
                className={`${base} ${vote === true ? 'border-primary/50 bg-primary/15 text-primary' : 'border-border text-[#a2b697] hover:border-primary/30'}`}
            >
                <ThumbsUp size={13} />
            </button>
            <button
                type="button"
                disabled={pending}
                aria-pressed={vote === false}
                aria-label={__('Not useful')}
                title={__('Not useful')}
                onClick={() => send(false)}
                className={`${base} ${vote === false ? 'border-red-300/50 bg-red-400/10 text-[#f3baa5]' : 'border-border text-[#a2b697] hover:border-red-300/30'}`}
            >
                <ThumbsDown size={13} />
            </button>
        </span>
    );
}
