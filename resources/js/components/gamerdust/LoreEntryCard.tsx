import { Link, router } from '@inertiajs/react';
import type { LoreEntry } from '../../types/lore';

interface LoreEntryCardProps {
    entry: LoreEntry;
}

export default function LoreEntryCard({ entry }: LoreEntryCardProps) {
    const destroy = () => {
        if (confirm(`Eliminar "${entry.title}"?`)) {
            router.delete(`/projects/${entry.project_id}/lore/${entry.id}`);
        }
    };

    return (
        <article className="border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-start justify-between gap-4">
                <h3 className="font-semibold text-white">{entry.title}</h3>
                <span className="border border-teal-800 bg-teal-950/50 px-2 py-1 text-xs text-teal-200">{entry.type}</span>
            </div>
            <p className="mt-3 text-sm text-zinc-300">{entry.description || 'Sin descripcion.'}</p>
            {entry.narrative_function && <p className="mt-3 text-sm text-amber-100">{entry.narrative_function}</p>}
            <div className="mt-4 flex gap-2">
                <Link href={`/projects/${entry.project_id}/lore/${entry.id}/edit`} className="border border-zinc-700 px-3 py-2 text-sm hover:border-amber-500">
                    Editar
                </Link>
                <button type="button" onClick={destroy} className="border border-rose-800 px-3 py-2 text-sm text-rose-200 hover:bg-rose-950">
                    Eliminar
                </button>
            </div>
        </article>
    );
}
