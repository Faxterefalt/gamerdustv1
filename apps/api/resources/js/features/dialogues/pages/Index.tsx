import { Head, Link } from '@inertiajs/react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import DialogueNodeCard from '../components/DialogueNodeCard';
import type { DialogueNode } from '../dialogues.types';
import type { Paginated, Project } from '../../projects/projects.types';

interface DialoguesIndexProps {
    project: Project;
    dialogues: Paginated<DialogueNode>;
}

export default function Index({ project, dialogues }: DialoguesIndexProps) {
    return (
        <ProjectLayout
            title={`Dialogos - ${project.title}`}
            actions={
                <div className="flex gap-2">
                    <Link href={`/projects/${project.id}`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                        Panel
                    </Link>
                    <Link href={`/projects/${project.id}/dialogues/create`} className="border border-amber-600 px-4 py-2 text-sm text-amber-100 hover:bg-amber-950">
                        Nuevo nodo
                    </Link>
                </div>
            }
        >
            <Head title={`Dialogos - ${project.title}`} />
            <div className="grid gap-4 lg:grid-cols-2">
                {dialogues.data.map((dialogue) => (
                    <DialogueNodeCard key={dialogue.id} dialogue={dialogue} />
                ))}
            </div>
        </ProjectLayout>
    );
}
