import { Link } from '@inertiajs/react';
import { ChartNoAxesCombined, HeartPulse } from 'lucide-react';
import { __ } from '../../../shared/lib/i18n';

export type AnalysisTab = 'metrics' | 'evolution';

/**
 * Pestañas de "Análisis IA": métricas del texto y evolución emocional (gráficos).
 */
export default function AnalysisTabs({ projectId, active }: { projectId: number; active: AnalysisTab }) {
    const base = `/projects/${projectId}/analysis`;
    const tabs = [
        { key: 'metrics', label: __('Metrics and coherence'), href: base, icon: ChartNoAxesCombined },
        { key: 'evolution', label: __('Emotional evolution'), href: `${base}/evolution`, icon: HeartPulse },
    ] as const;

    return (
        <nav aria-label={__('AI Analysis sections')} className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
            {tabs.map(({ key, label, href, icon: Icon }) => (
                <Link
                    key={key}
                    href={href}
                    aria-current={active === key ? 'page' : undefined}
                    className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs transition ${active === key ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}
                >
                    <Icon size={14} />
                    {label}
                </Link>
            ))}
        </nav>
    );
}
