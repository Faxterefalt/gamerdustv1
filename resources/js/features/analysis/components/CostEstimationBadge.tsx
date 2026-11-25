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
    low: 'border-success/50 bg-success/10 text-success',
    medium: 'border-primary/50 bg-primary/10 text-primary',
    high: 'border-danger/50 bg-danger/10 text-danger',
};

export default function CostEstimationBadge({ level }: CostEstimationBadgeProps) {
    const normalized = level ?? 'low';

    return (
        <span className={`inline-flex items-center border px-2 py-1 text-xs font-medium ${classes[normalized] ?? classes.low}`}>
            {__(labels[normalized] ?? labels.low)}
        </span>
    );
}
