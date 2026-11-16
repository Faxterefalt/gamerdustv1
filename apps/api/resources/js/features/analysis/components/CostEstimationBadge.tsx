import { __ } from '../../../shared/lib/i18n';
import type { CostLevel } from '../cost.types';

interface CostEstimationBadgeProps {
    level?: CostLevel | string | null;
}

const labels: Record<string, string> = {
    low: 'Low cost',
    medium: 'Medium cost',
    high: 'High cost',
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
            {__(labels[normalized] ?? labels.low)}
        </span>
    );
}
