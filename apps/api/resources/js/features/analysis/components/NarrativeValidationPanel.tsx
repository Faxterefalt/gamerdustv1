import { __ } from '../../../shared/lib/i18n';
import { router } from '@inertiajs/react';
import { severityLabel } from '../labels';
import type { NarrativeValidation } from '../validation.types';

interface NarrativeValidationPanelProps {
    projectId: number;
    validations?: NarrativeValidation[];
}

const severityClass: Record<string, string> = {
    low: 'border-teal-700 text-teal-200',
    medium: 'border-amber-700 text-amber-200',
    high: 'border-rose-700 text-rose-200',
};

export default function NarrativeValidationPanel({ projectId, validations = [] }: NarrativeValidationPanelProps) {
    return (
        <section className="border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="font-semibold text-white">{__('Narrative validations')}</h2>
                    <p className="text-sm text-zinc-400">{__('Simple coherence rules to detect early gaps.')}</p>
                </div>
                <button type="button" onClick={() => router.post(`/projects/${projectId}/validations`)} className="border border-zinc-700 px-3 py-2 text-sm hover:border-amber-500">
                    {__('Recalculate')}
                </button>
            </div>

            <div className="mt-4 space-y-3">
                {validations.length === 0 && <p className="text-sm text-zinc-400">{__('No pending warnings.')}</p>}
                {validations.map((validation) => (
                    <div key={validation.id} className="border border-zinc-800 bg-zinc-950 p-3">
                        <div className="flex items-start justify-between gap-4">
                            <span className={`border px-2 py-1 text-xs ${severityClass[validation.severity]}`}>{severityLabel(validation.severity)}</span>
                            <button type="button" onClick={() => router.patch(`/projects/${projectId}/validations/${validation.id}`)} className="text-sm text-zinc-400 hover:text-white">
                                {__('Resolve')}
                            </button>
                        </div>
                        <p className="mt-3 text-sm text-zinc-200">{validation.message}</p>
                        {validation.recommendation && <p className="mt-2 text-sm text-zinc-400">{validation.recommendation}</p>}
                    </div>
                ))}
            </div>
        </section>
    );
}
