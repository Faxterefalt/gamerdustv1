import { __ } from '../../../shared/lib/i18n';
import { Head, Link } from '@inertiajs/react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import DialogueNodeCard from '../components/DialogueNodeCard';
import type { DialogueNode } from '../dialogues.types';
import type { Paginated, Project } from '../../projects/projects.types';
import { primarySm, secondary } from '../../../shared/lib/styles';

interface DialoguesIndexProps {
    project: Project;
    dialogues: Paginated<DialogueNode>;
}

export default function Index({ project, dialogues }: DialoguesIndexProps) {
    return (
        <ProjectLayout
            title={`${__('Dialogues')} - ${project.title}`}
            actions={
                <div className="flex gap-2">
                    <Link href={`/projects/${project.id}/branching`} className={secondary}>
                        {__('Branching editor')}
                    </Link>
                    <Link href={`/projects/${project.id}`} className={secondary}>
                        {__('Dashboard')}
                    </Link>
                    <Link href={`/projects/${project.id}/dialogues/create`} className={primarySm}>
                        {__('New node')}
                    </Link>
                </div>
            }
        >
            <Head title={`${__('Dialogues')} - ${project.title}`} />
            <div className="grid gap-4 lg:grid-cols-2">
                {dialogues.data.map((dialogue) => (
                    <DialogueNodeCard key={dialogue.id} dialogue={dialogue} />
                ))}
            </div>
        </ProjectLayout>
    );
}
