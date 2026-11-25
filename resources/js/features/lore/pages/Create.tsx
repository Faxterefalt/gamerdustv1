import { __ } from '../../../shared/lib/i18n';
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
            title={__('New lore entry')}
            actions={
                <Link href={`/projects/${project.id}/lore`} className="border border-border-strong px-4 py-2 text-sm hover:border-primary">
                    {__('Back')}
                </Link>
            }
        >
            <Head title={__('New lore entry')} />
            <LoreEntryForm projectId={project.id} submitLabel={__('Create entry')} />
        </ProjectLayout>
    );
}
