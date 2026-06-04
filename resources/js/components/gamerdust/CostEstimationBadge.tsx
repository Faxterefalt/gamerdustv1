import type { CostLevel } from '../../types/cost';

interface CostEstimationBadgeProps {
    level?: CostLevel | string | null;
}

const labels: Record<string, string> = {
    low: 'Costo bajo',
    medium: 'Costo medio',
    high: 'Costo alto',
};

const classes: Record<string, string> = {
    low: 'border-emerald-700 bg-emerald-950/60 text-emerald-200',
    medium: 'border-amber-700 bg-amber-950/60 text-amber-200',
    high: 'border-rose-700 bg-rose-950/60 text-rose-200',
};

export default function CostEstimationBadge({ level }: CostEstimationBadgeProps) {
    const normalized = level ?? 'low';

    return (
        <span className={`inline-flex items-center border px-2 py-1 text-xs font-medium ${classes[normalized] ?? classes.low}`}>
            {labels[normalized] ?? labels.low}
        </span>
    );
}
