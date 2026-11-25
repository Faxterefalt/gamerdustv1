import { __, choice } from '../../../shared/lib/i18n';
import { Link, router } from '@inertiajs/react';
import { AlertOctagon, AlertTriangle, Eye, Info } from 'lucide-react';
import { severityLabel } from '../labels';
import type { NarrativeValidation, ValidationStatus } from '../validation.types';
import { secondary } from '../../../shared/lib/styles';

interface NarrativeValidationPanelProps {
    projectId: number;
    validations?: NarrativeValidation[];
    /** Resueltas o descartadas cuya causa sigue presente: no se recrean, pero se pueden reabrir. */
    closed?: NarrativeValidation[];
}

// La severidad se lee por icono y palabra, no solo por color (WCAG 1.4.1).
const SEVERITY: Record<string, { tone: string; icon: typeof Info }> = {
    high: { tone: 'border-danger/50 bg-danger/10 text-danger', icon: AlertOctagon },
    medium: { tone: 'border-warning/50 bg-warning/10 text-warning', icon: AlertTriangle },
    low: { tone: 'border-info/50 bg-info/10 text-info', icon: Info },
    review: { tone: 'border-ember/50 bg-ember/10 text-ember', icon: Eye },
};

const STATUS_LABELS: Record<ValidationStatus, string> = { pending: 'Pending', resolved: 'Resolved', dismissed: 'Dismissed' };

const textButton = 'inline-flex min-h-10 items-center rounded-md px-2 text-sm transition-colors hover:bg-surface-2 pointer-coarse:min-h-11';

export default function NarrativeValidationPanel({ projectId, validations = [], closed = [] }: NarrativeValidationPanelProps) {
    const setStatus = (validation: NarrativeValidation, status: ValidationStatus) =>
        router.patch(`/projects/${projectId}/validations/${validation.id}`, { status }, { preserveScroll: true });

    return (
        <section className="rounded-lg border border-border bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <h2 className="text-lg font-bold">{__('Narrative validations')}</h2>
                    <p className="mt-1 text-sm text-muted">{__('Simple coherence rules to detect early gaps.')}</p>
                </div>
                <button type="button" onClick={() => router.post(`/projects/${projectId}/validations`, {}, { preserveScroll: true })} className={secondary}>
                    {__('Recalculate')}
                </button>
            </div>

            {validations.length === 0 ? (
                <p className="mt-5 border-t border-border pt-5 text-sm text-muted">{__('No pending warnings.')}</p>
            ) : (
                <ul className="mt-4 divide-y divide-border border-t border-border">
                    {validations.map((validation) => {
                        const severity = SEVERITY[validation.severity] ?? SEVERITY.low;
                        const Icon = severity.icon;

                        return (
                            <li key={validation.id} className="py-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-bold ${severity.tone}`}>
                                        <Icon size={14} aria-hidden="true" /> {severityLabel(validation.severity)}
                                    </span>
                                    <div className="-mr-2 flex">
                                        <button type="button" onClick={() => setStatus(validation, 'resolved')} className={`${textButton} text-foreground`}>
                                            {__('Resolve')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setStatus(validation, 'dismissed')}
                                            title={__('It will not appear again while its cause stays the same.')}
                                            className={`${textButton} text-muted`}
                                        >
                                            {__('Dismiss')}
                                        </button>
                                    </div>
                                </div>
                                <p className="mt-2">{validation.message}</p>
                                {validation.recommendation && <p className="mt-1 text-sm text-muted">{validation.recommendation}</p>}
                                <SubjectLink validation={validation} />
                            </li>
                        );
                    })}
                </ul>
            )}

            {closed.length > 0 && (
                <details className="mt-2 border-t border-border pt-2">
                    <summary className="flex min-h-11 cursor-pointer items-center text-sm text-muted hover:text-foreground">
                        {choice(':count closed warning|:count closed warnings', closed.length)}
                    </summary>
                    <ul className="divide-y divide-border">
                        {closed.map((validation) => (
                            <li key={validation.id} className="flex items-start justify-between gap-4 py-3">
                                <div className="min-w-0">
                                    <p className="text-xs text-subtle">{__(STATUS_LABELS[validation.status])}</p>
                                    <p className="mt-1 text-sm text-muted">{validation.message}</p>
                                    <SubjectLink validation={validation} />
                                </div>
                                <button type="button" onClick={() => setStatus(validation, 'pending')} className={`${textButton} shrink-0 text-muted`}>
                                    {__('Reopen')}
                                </button>
                            </li>
                        ))}
                    </ul>
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
        <Link href={validation.subject.url} className="mt-1 inline-flex min-h-10 items-center text-sm text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary">
            {__('Go to :element', { element: validation.subject.label })}
        </Link>
    );
}
