import { __, choice } from '../../../shared/lib/i18n';
import { Link, router } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';
import { severityLabel } from '../labels';
import type { NarrativeValidation, ValidationStatus } from '../validation.types';

interface NarrativeValidationPanelProps {
    projectId: number;
    validations?: NarrativeValidation[];
    /** Resueltas o descartadas cuya causa sigue presente: no se recrean, pero se pueden reabrir. */
    closed?: NarrativeValidation[];
}

const severityClass: Record<string, string> = {
    low: 'border-teal-700 text-teal-200',
    medium: 'border-amber-700 text-amber-200',
    high: 'border-rose-700 text-rose-200',
    review: 'border-sky-700 text-sky-200',
};

const STATUS_LABELS: Record<ValidationStatus, string> = { pending: 'Pending', resolved: 'Resolved', dismissed: 'Dismissed' };

export default function NarrativeValidationPanel({ projectId, validations = [], closed = [] }: NarrativeValidationPanelProps) {
    const setStatus = (validation: NarrativeValidation, status: ValidationStatus) =>
        router.patch(`/projects/${projectId}/validations/${validation.id}`, { status }, { preserveScroll: true });

    return (
        <section className="border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="font-semibold text-white">{__('Narrative validations')}</h2>
                    <p className="text-sm text-zinc-400">{__('Simple coherence rules to detect early gaps.')}</p>
                </div>
                <button
                    type="button"
                    onClick={() => router.post(`/projects/${projectId}/validations`, {}, { preserveScroll: true })}
                    className="border border-zinc-700 px-3 py-2 text-sm hover:border-amber-500"
                >
                    {__('Recalculate')}
                </button>
            </div>

            <div className="mt-4 space-y-3">
                {validations.length === 0 && <p className="text-sm text-zinc-400">{__('No pending warnings.')}</p>}
                {validations.map((validation) => (
                    <div key={validation.id} className="border border-zinc-800 bg-zinc-950 p-3">
                        <div className="flex items-start justify-between gap-4">
                            <span className={`border px-2 py-1 text-xs ${severityClass[validation.severity] ?? severityClass.low}`}>{severityLabel(validation.severity)}</span>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setStatus(validation, 'resolved')} className="text-sm text-zinc-400 hover:text-white">
                                    {__('Resolve')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatus(validation, 'dismissed')}
                                    title={__('It will not appear again while its cause stays the same.')}
                                    className="text-sm text-zinc-500 hover:text-white"
                                >
                                    {__('Dismiss')}
                                </button>
                            </div>
                        </div>
                        <p className="mt-3 text-sm text-zinc-200">{validation.message}</p>
                        {validation.recommendation && <p className="mt-2 text-sm text-zinc-400">{validation.recommendation}</p>}
                        <SubjectLink validation={validation} />
                    </div>
                ))}
            </div>

            {closed.length > 0 && (
                <details className="mt-4 border-t border-zinc-800 pt-3">
                    <summary className="cursor-pointer text-sm text-zinc-400 hover:text-white">
                        {choice(':count closed warning|:count closed warnings', closed.length)}
                    </summary>
                    <div className="mt-3 space-y-2">
                        {closed.map((validation) => (
                            <div key={validation.id} className="flex items-start justify-between gap-4 border border-zinc-800 bg-zinc-950/60 p-3">
                                <div className="min-w-0">
                                    <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">{__(STATUS_LABELS[validation.status])}</p>
                                    <p className="mt-1 text-sm text-zinc-300">{validation.message}</p>
                                    <SubjectLink validation={validation} />
                                </div>
                                <button type="button" onClick={() => setStatus(validation, 'pending')} className="shrink-0 text-sm text-zinc-400 hover:text-white">
                                    {__('Reopen')}
                                </button>
                            </div>
                        ))}
                    </div>
                </details>
            )}
        </section>
    );
}

/** Evidencia: enlace al elemento afectado (escena, personaje, regla, sección del proyecto). */
function SubjectLink({ validation }: { validation: NarrativeValidation }) {
    if (!validation.subject) {
        return null;
    }

    return (
        <Link href={validation.subject.url} className="mt-2 inline-flex items-center gap-1 text-xs text-amber-300 hover:text-amber-100">
            {__('Go to :element', { element: validation.subject.label })} <ArrowUpRight size={12} />
        </Link>
    );
}
