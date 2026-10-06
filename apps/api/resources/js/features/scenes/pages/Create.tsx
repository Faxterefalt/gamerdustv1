import { Head, Link } from '@inertiajs/react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import SceneForm from '../components/SceneForm';
import type { Project } from '../../projects/projects.types';

interface SceneCreateProps {
    project: Project;
}

export default function Create({ project }: SceneCreateProps) {
    return (
        <ProjectLayout
            title="Nueva escena"
            actions={
                <Link href={`/projects/${project.id}/scenes`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                    Volver
                </Link>
            }
        >
            <Head title="Nueva escena" />
            <SceneForm projectId={project.id} submitLabel="Crear escena" />
        </ProjectLayout>
    );
}
