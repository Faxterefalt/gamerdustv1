import { __ } from '../../../shared/lib/i18n';
import { Head, Link } from '@inertiajs/react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import ProjectForm from '../components/ProjectForm';
import type { Project } from '../projects.types';

interface ProjectEditProps {
    project: Project;
}

export default function Edit({ project }: ProjectEditProps) {
    return (
        <ProjectLayout
            title={__('Edit :name', { name: project.title })}
            actions={
                <Link href={`/projects/${project.id}`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                    {__('Back')}
                </Link>
            }
        >
            <Head title={__('Edit :name', { name: project.title })} />
            <ProjectForm project={project} />
        </ProjectLayout>
    );
}
