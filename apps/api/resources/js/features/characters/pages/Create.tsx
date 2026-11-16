import { __ } from '../../../shared/lib/i18n';
import { Head, Link } from '@inertiajs/react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import CharacterForm from '../components/CharacterForm';
import type { Project } from '../../projects/projects.types';

interface CharacterCreateProps {
    project: Project;
}

export default function Create({ project }: CharacterCreateProps) {
    return (
        <ProjectLayout
            title={__('New character')}
            actions={
                <Link href={`/projects/${project.id}/characters`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                    {__('Back')}
                </Link>
            }
        >
            <Head title={__('New character')} />
            <CharacterForm projectId={project.id} submitLabel={__('Create character')} />
        </ProjectLayout>
    );
}
