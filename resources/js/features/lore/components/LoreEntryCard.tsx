import { __ } from '../../../shared/lib/i18n';
import { Link, router } from '@inertiajs/react';
import type { LoreEntry } from '../lore.types';
import { loreTypeLabel } from '../loreOptions';
import { dangerButton, secondary } from '../../../shared/lib/styles';

interface LoreEntryCardProps {
    entry: LoreEntry;
}

export default function LoreEntryCard({ entry }: LoreEntryCardProps) {
    const destroy = () => {
        if (confirm(__('Delete ":name"?', { name: entry.title }))) {
            router.delete(`/projects/${entry.project_id}/lore/${entry.id}`);
        }
    };

    return (
        <article className="border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-4">
                <h3 className="font-semibold text-foreground">{entry.title}</h3>
                <span className="border border-success/50 bg-success/10 px-2 py-1 text-xs text-success">{loreTypeLabel(entry.type)}</span>
            </div>
            <p className="mt-3 text-sm text-muted">{entry.description || __('No description.')}</p>
            {entry.narrative_function && <p className="mt-3 text-sm text-foreground">{entry.narrative_function}</p>}
            <div className="mt-4 flex gap-2">
                <Link href={`/projects/${entry.project_id}/lore/${entry.id}/edit`} className={secondary}>
                    {__('Edit')}
                </Link>
                <button type="button" onClick={destroy} className={dangerButton}>
                    {__('Delete')}
                </button>
            </div>
        </article>
    );
}
