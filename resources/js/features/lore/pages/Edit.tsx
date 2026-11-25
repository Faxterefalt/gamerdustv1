import { __ } from '../../../shared/lib/i18n';
import { Head, Link } from '@inertiajs/react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import LoreEntryForm from '../components/LoreEntryForm';
import type { LoreEntry } from '../lore.types';
import type { Project } from '../../projects/projects.types';
import { secondary } from '../../../shared/lib/styles';

interface LoreEditProps {
    project: Project;
    loreEntry: LoreEntry;
}

export default function Edit({ project, loreEntry }: LoreEditProps) {
    return (
        <ProjectLayout
            title={__('Edit :name', { name: loreEntry.title })}
            actions={
                <Link href={`/projects/${project.id}/lore`} className={secondary}>
                    {__('Back')}
                </Link>
            }
        >
            <Head title={__('Edit :name', { name: loreEntry.title })} />
            <LoreEntryForm projectId={project.id} entry={loreEntry} method="put" submitLabel={__('Save changes')} />
        </ProjectLayout>
    );
}
