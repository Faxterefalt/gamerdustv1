import { __ } from '../../../shared/lib/i18n';
import { Head, Link } from '@inertiajs/react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import LoreEntryForm from '../components/LoreEntryForm';
import type { Project } from '../../projects/projects.types';
import { secondary } from '../../../shared/lib/styles';

interface LoreCreateProps {
    project: Project;
}

export default function Create({ project }: LoreCreateProps) {
    return (
        <ProjectLayout
            title={__('New lore entry')}
            actions={
                <Link href={`/projects/${project.id}/lore`} className={secondary}>
                    {__('Back')}
                </Link>
            }
        >
            <Head title={__('New lore entry')} />
            <LoreEntryForm projectId={project.id} submitLabel={__('Create entry')} />
        </ProjectLayout>
    );
}
