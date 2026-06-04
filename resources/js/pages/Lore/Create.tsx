import { Head, Link } from '@inertiajs/react';
import AppShell from '../../components/gamerdust/AppShell';
import LoreEntryForm from '../../components/gamerdust/LoreEntryForm';
import type { Project } from '../../types/project';

interface LoreCreateProps {
    project: Project;
}

export default function Create({ project }: LoreCreateProps) {
    return (
        <AppShell
            title="Nueva entrada de lore"
            actions={
                <Link href={`/projects/${project.id}/lore`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                    Volver
                </Link>
            }
        >
            <Head title="Nueva entrada de lore" />
            <LoreEntryForm projectId={project.id} submitLabel="Crear entrada" />
        </AppShell>
    );
}
