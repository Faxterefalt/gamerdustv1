import { __ } from '../../../shared/lib/i18n';
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
            title={__('New scene')}
            actions={
                <Link href={`/projects/${project.id}/scenes`} className="border border-border-strong px-4 py-2 text-sm hover:border-primary">
                    {__('Back')}
                </Link>
            }
        >
            <Head title={__('New scene')} />
            <SceneForm projectId={project.id} submitLabel={__('Create scene')} />
        </ProjectLayout>
    );
}
