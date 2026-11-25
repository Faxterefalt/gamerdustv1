import { Link } from '@inertiajs/react';
import { ArrowUpRight, Scale } from 'lucide-react';
import { useState } from 'react';
import Modal, { FormError, Pending } from '../../../shared/components/ui';
import { api, ApiError } from '../../../shared/lib/api';
import { __ } from '../../../shared/lib/i18n';
import { primarySm } from '../../../shared/lib/styles';
import FeedbackButtons from '../../analysis/components/FeedbackButtons';
import { severityLabel } from '../../analysis/labels';

/** LudonarrativeReviewService::review (HU 56). */
interface DissonanceReview {
    summary: string;
    findings: {
        mechanic_id: number;
        mechanic_title: string;
        element: { type: 'scene' | 'character' | 'rule'; id: number; label: string; url: string } | null;
        conflict: string;
        evidence: string;
        severity: 'low' | 'medium' | 'high';
    }[];
    /** Mecánicas sin escenas ni personajes vinculados: no se pueden contrastar. */
    insufficient: { id: number; title: string }[];
    reviewed: number[];
    generation_id: number | null;
}

interface DissonanceDialogProps {
    projectId: number;
    /** Hay cambios sin guardar en la mecánica abierta: la IA lee lo guardado. */
    dirty: boolean;
    onSelectMechanic: (id: number) => void;
    onClose: () => void;
}

const SEVERITY_CLASS = { low: 'border-teal-800 text-teal-200', medium: 'border-amber-800 text-amber-200', high: 'border-rose-800 text-rose-200' } as const;

// Claves de traducción del tipo de elemento contrastado.
const ELEMENT_LABEL = { scene: 'Scene', character: 'Character', rule: 'World rule' } as const;

/**
 * "Detectar disonancias" (HU 56): la IA contrasta cada mecánica con las escenas, personajes y reglas
 * vinculadas. Solo se llama al pulsar el botón y nunca modifica nada.
 */
export default function DissonanceDialog({ projectId, dirty, onSelectMechanic, onClose }: DissonanceDialogProps) {
    const [result, setResult] = useState<DissonanceReview | null>(null);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');

    async function review() {
        setPending(true);
        setError('');

        try {
            setResult(await api<DissonanceReview>('POST', `/projects/${projectId}/ai/ludonarrative-review`));
        } catch (caught) {
            setError(caught instanceof ApiError && caught.status !== 429 ? caught.message : __('AI is busy, try again in a minute'));
        } finally {
            setPending(false);
        }
    }

    return (
        <Modal title={__('Detect dissonances')} wide onClose={() => !pending && onClose()}>
            <p className="mb-4 text-xs leading-6 text-[#a9bb9d]">
                {__('The AI compares what each mechanic lets the player do with the scenes, characters and world rules linked to it, and points out where they clash. It only suggests: nothing is changed.')}
            </p>
            {dirty && <p className="mb-3 text-[10px] text-amber-200">{__('You have unsaved changes: the review uses the saved mechanics.')}</p>}

            <button type="button" disabled={pending} onClick={() => void review()} className={`${primarySm} w-full`}>
                <Pending pending={pending}>
                    <Scale size={14} /> {result ? __('Review again') : __('Detect dissonances')}
                </Pending>
            </button>
            <FormError error={error} />

            {result && (
                <div className="mt-5 space-y-3">
                    {result.summary && <p className="text-xs leading-6 text-[#d3dfca]">{result.summary}</p>}
                    {result.reviewed.length > 0 && !result.findings.length && <p className="text-xs text-[#a9bb9d]">{__('No dissonances were found in the reviewed mechanics.')}</p>}
                    <ul className="space-y-2">
                        {result.findings.map((finding, index) => (
                            <li key={index} className="rounded-md border border-border p-3 text-xs leading-6">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded border px-1.5 text-[10px] ${SEVERITY_CLASS[finding.severity]}`}>{severityLabel(finding.severity)}</span>
                                    <button type="button" onClick={() => onSelectMechanic(finding.mechanic_id)} className="font-medium text-primary hover:underline">
                                        {finding.mechanic_title}
                                    </button>
                                    {finding.element && (
                                        <>
                                            <span className="text-[#a9bb9d]">↔</span>
                                            <Link href={finding.element.url} className="inline-flex items-center gap-1 text-[#cfe0c4] hover:underline">
                                                {__(ELEMENT_LABEL[finding.element.type])}: {finding.element.label} <ArrowUpRight size={11} />
                                            </Link>
                                        </>
                                    )}
                                </div>
                                <p className="mt-1.5 text-[#dce6d5]">{finding.conflict}</p>
                                {finding.evidence && <p className="mt-1 border-l-2 border-primary/40 pl-2 font-mono text-[10px] italic text-[#b6c6aa]">{finding.evidence}</p>}
                            </li>
                        ))}
                    </ul>
                    {result.insufficient.length > 0 && (
                        <div className="rounded-md border border-dashed border-border p-3 text-[11px] leading-6 text-[#b4c4a8]">
                            <p className="font-medium text-[#dce6d5]">{__('Insufficient context')}</p>
                            <p>{__('These mechanics have no linked scenes or characters, so they could not be compared with the story:')}</p>
                            <p className="mt-1 flex flex-wrap gap-1.5">
                                {result.insufficient.map((mechanic) => (
                                    <button key={mechanic.id} type="button" onClick={() => onSelectMechanic(mechanic.id)} className="rounded border border-border px-2 text-primary hover:border-primary/40">
                                        {mechanic.title}
                                    </button>
                                ))}
                            </p>
                        </div>
                    )}
                    {result.generation_id && (
                        <div className="flex items-center justify-end gap-2 text-[10px] text-[#a9bb9d]">
                            {__('Was this review useful?')}
                            <FeedbackButtons key={result.generation_id} projectId={projectId} target={{ ai_generation_id: result.generation_id }} />
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}
