import { __ } from '../../../shared/lib/i18n';
import { Head, Link } from '@inertiajs/react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import ProjectForm from '../components/ProjectForm';
import type { Project } from '../projects.types';
import { secondary } from '../../../shared/lib/styles';

interface ProjectEditProps {
    project: Project;
}

export default function Edit({ project }: ProjectEditProps) {
    return (
        <ProjectLayout
            title={__('Edit :name', { name: project.title })}
            actions={
                <Link href={`/projects/${project.id}`} className={secondary}>
                    {__('Back')}
                </Link>
            }
        >
            <Head title={__('Edit :name', { name: project.title })} />
            <ProjectForm project={project} />
        </ProjectLayout>
    );
}
