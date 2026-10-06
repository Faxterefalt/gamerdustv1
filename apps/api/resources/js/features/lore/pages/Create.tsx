import { Head, Link } from '@inertiajs/react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import LoreEntryForm from '../components/LoreEntryForm';
import type { Project } from '../../projects/projects.types';

interface LoreCreateProps {
    project: Project;
}

export default function Create({ project }: LoreCreateProps) {
    return (
        <ProjectLayout
            title="Nueva entrada de lore"
            actions={
                <Link href={`/projects/${project.id}/lore`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                    Volver
                </Link>
            }
        >
            <Head title="Nueva entrada de lore" />
            <LoreEntryForm projectId={project.id} submitLabel="Crear entrada" />
        </ProjectLayout>
    );
}
