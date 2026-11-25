import { __ } from '../../../shared/lib/i18n';
import { Head, Link } from '@inertiajs/react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import LoreEntryCard from '../components/LoreEntryCard';
import type { LoreEntry } from '../lore.types';
import type { Paginated, Project } from '../../projects/projects.types';
import { primarySm, secondary } from '../../../shared/lib/styles';

interface LoreIndexProps {
    project: Project;
    loreEntries: Paginated<LoreEntry>;
}

export default function Index({ project, loreEntries }: LoreIndexProps) {
    return (
        <ProjectLayout
            title={`Lore - ${project.title}`}
            actions={
                <div className="flex gap-2">
                    <Link href={`/projects/${project.id}`} className={secondary}>
                        {__('Dashboard')}
                    </Link>
                    <Link href={`/projects/${project.id}/lore/create`} className={primarySm}>
                        {__('New entry')}
                    </Link>
                </div>
            }
        >
            <Head title={`Lore - ${project.title}`} />
            <div className="grid gap-4 lg:grid-cols-2">
                {loreEntries.data.map((entry) => (
                    <LoreEntryCard key={entry.id} entry={entry} />
                ))}
            </div>
        </ProjectLayout>
    );
}
