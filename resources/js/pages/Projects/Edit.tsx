import { Head, Link } from '@inertiajs/react';
import AppShell from '../../components/gamerdust/AppShell';
import ProjectForm from '../../components/gamerdust/ProjectForm';
import type { Project } from '../../types/project';

interface ProjectEditProps {
    project: Project;
}

export default function Edit({ project }: ProjectEditProps) {
    return (
        <AppShell
            title={`Editar ${project.title}`}
            actions={
                <Link href={`/projects/${project.id}`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                    Volver
                </Link>
            }
        >
            <Head title={`Editar ${project.title}`} />
            <ProjectForm project={project} action={`/projects/${project.id}`} method="put" submitLabel="Guardar cambios" />
        </AppShell>
    );
}
