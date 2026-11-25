import { ArrowUpRight, ScanSearch } from 'lucide-react';
import { useState } from 'react';
import Modal, { FormError, Pending } from '../../../shared/components/ui';
import { api, ApiError } from '../../../shared/lib/api';
import { __ } from '../../../shared/lib/i18n';
import { primarySm } from '../../../shared/lib/styles';
import FeedbackButtons from '../../analysis/components/FeedbackButtons';
import { severityLabel } from '../../analysis/labels';
import type { ConsequenceReview } from '../branching.types';

interface ConsequenceReviewDialogProps {
    projectId: number;
    /** Guarda los borradores pendientes antes de revisar (la IA lee el grafo guardado). */
    beforeReview: () => Promise<void>;
    onGoToNode: (nodeId: number) => void;
    onClose: () => void;
}

// Claves de traducción de los tipos de hallazgo.
const KIND_LABEL: Record<ConsequenceReview['findings'][number]['kind'], string> = {
    incompatibility: 'Incompatibility',
    convergence: 'Convergence (review)',
    dead_condition: 'Condition that can never be met',
    unused_effect: 'Effect no condition uses',
};

const SEVERITY_CLASS = { low: 'border-success/50 text-success', medium: 'border-primary/50 text-primary', high: 'border-danger/50 text-danger' } as const;

/**
 * "Revisar consecuencias" (HU 50): la IA solo se llama al pulsar el botón y nunca modifica el grafo.
 * Cada hallazgo enlaza a la opción afectada; las convergencias se muestran como revisión.
 */
export default function ConsequenceReviewDialog({ projectId, beforeReview, onGoToNode, onClose }: ConsequenceReviewDialogProps) {
    const [result, setResult] = useState<ConsequenceReview | null>(null);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');

    async function review() {
        setPending(true);
        setError('');

        try {
            await beforeReview();
            setResult(await api<ConsequenceReview>('POST', `/projects/${projectId}/ai/consequence-review`));
        } catch (caught) {
            setError(caught instanceof ApiError && caught.status !== 429 ? caught.message : __('AI is busy, try again in a minute'));
        } finally {
            setPending(false);
        }
    }

    return (
        <Modal title={__('Review consequences')} wide onClose={() => !pending && onClose()}>
            <p className="mb-4 text-xs leading-6 text-muted">
                {__('The AI reads the saved graph (options, conditions, effects and variables) with the Narrative Bible and points out decisions that may not fit together. It only suggests: nothing is changed.')}
            </p>

            <button type="button" disabled={pending} onClick={() => void review()} className={`${primarySm} w-full`}>
                <Pending pending={pending}>
                    <ScanSearch size={14} /> {result ? __('Review again') : __('Review consequences')}
                </Pending>
            </button>
            <FormError error={error} />

            {result && (
                <div className="mt-5 space-y-3">
                    {result.summary && <p className="text-xs leading-6 text-foreground">{result.summary}</p>}
                    {result.truncated && <p className="text-xs text-primary">{__('The graph is large: only the first nodes were reviewed.')}</p>}
                    {!result.findings.length && <p className="text-xs text-muted">{__('No incompatibilities were found.')}</p>}
                    <ul className="space-y-2">
                        {result.findings.map((finding, index) => (
                            <li key={index} className={`rounded-md border p-3 text-xs leading-6 ${finding.review ? 'border-info/50 bg-info/10' : 'border-border'}`}>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded border px-1.5 text-xs ${finding.review ? 'border-info/50 text-info' : SEVERITY_CLASS[finding.severity]}`}>
                                        {finding.review ? __('Review') : severityLabel(finding.severity)}
                                    </span>
                                    <span className="text-xs text-muted">{__(KIND_LABEL[finding.kind])}</span>
                                </div>
                                <p className="mt-1.5 text-foreground">{finding.explanation}</p>
                                {finding.evidence && <p className="mt-1 border-l-2 border-primary/40 pl-2 text-xs italic text-muted">{finding.evidence}</p>}
                                <button
                                    type="button"
                                    onClick={() => onGoToNode(finding.node_id)}
                                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                    {__('Option ":option" in :node', { option: finding.option_label, node: finding.node_title })} <ArrowUpRight size={12} />
                                </button>
                            </li>
                        ))}
                    </ul>
                    {result.generation_id && (
                        <div className="flex items-center justify-end gap-2 text-xs text-muted">
                            {__('Was this review useful?')}
                            <FeedbackButtons key={result.generation_id} projectId={projectId} target={{ ai_generation_id: result.generation_id }} />
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}
