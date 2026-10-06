import { Head, Link } from '@inertiajs/react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import LoreEntryForm from '../components/LoreEntryForm';
import type { LoreEntry } from '../lore.types';
import type { Project } from '../../projects/projects.types';

interface LoreEditProps {
    project: Project;
    loreEntry: LoreEntry;
}

export default function Edit({ project, loreEntry }: LoreEditProps) {
    return (
        <ProjectLayout
            title={`Editar ${loreEntry.title}`}
            actions={
                <Link href={`/projects/${project.id}/lore`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                    Volver
                </Link>
            }
        >
            <Head title={`Editar ${loreEntry.title}`} />
            <LoreEntryForm projectId={project.id} entry={loreEntry} method="put" submitLabel="Guardar cambios" />
        </ProjectLayout>
    );
}
