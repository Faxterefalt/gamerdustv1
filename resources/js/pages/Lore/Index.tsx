import { Head, Link } from '@inertiajs/react';
import AppShell from '../../components/gamerdust/AppShell';
import LoreEntryCard from '../../components/gamerdust/LoreEntryCard';
import type { LoreEntry } from '../../types/lore';
import type { Paginated, Project } from '../../types/project';

interface LoreIndexProps {
    project: Project;
    loreEntries: Paginated<LoreEntry>;
}

export default function Index({ project, loreEntries }: LoreIndexProps) {
    return (
        <AppShell
            title={`Lore - ${project.title}`}
            actions={
                <div className="flex gap-2">
                    <Link href={`/projects/${project.id}`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                        Panel
                    </Link>
                    <Link href={`/projects/${project.id}/lore/create`} className="border border-amber-600 px-4 py-2 text-sm text-amber-100 hover:bg-amber-950">
                        Nueva entrada
                    </Link>
                </div>
            }
        >
            <Head title={`Lore - ${project.title}`} />
            <div className="grid gap-4 lg:grid-cols-2">
                {loreEntries.data.map((entry) => (
                    <LoreEntryCard key={entry.id} entry={entry} />
                ))}
            </div>
        </AppShell>
    );
}
