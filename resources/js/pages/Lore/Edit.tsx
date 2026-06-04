import { Head, Link } from '@inertiajs/react';
import AppShell from '../../components/gamerdust/AppShell';
import LoreEntryForm from '../../components/gamerdust/LoreEntryForm';
import type { LoreEntry } from '../../types/lore';
import type { Project } from '../../types/project';

interface LoreEditProps {
    project: Project;
    loreEntry: LoreEntry;
}

export default function Edit({ project, loreEntry }: LoreEditProps) {
    return (
        <AppShell
            title={`Editar ${loreEntry.title}`}
            actions={
                <Link href={`/projects/${project.id}/lore`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                    Volver
                </Link>
            }
        >
            <Head title={`Editar ${loreEntry.title}`} />
            <LoreEntryForm projectId={project.id} entry={loreEntry} method="put" submitLabel="Guardar cambios" />
        </AppShell>
    );
}
