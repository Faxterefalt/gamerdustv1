import { __ } from '../../../shared/lib/i18n';
import { Head, Link } from '@inertiajs/react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import DialogueNodeForm from '../components/DialogueNodeForm';
import type { Character } from '../../characters/characters.types';
import type { DialogueNode } from '../dialogues.types';
import type { Project } from '../../projects/projects.types';
import type { Scene } from '../../scenes/scenes.types';

interface DialogueCreateProps {
    project: Project;
    scenes: Pick<Scene, 'id' | 'title'>[];
    characters: Pick<Character, 'id' | 'name'>[];
    dialogues: Pick<DialogueNode, 'id' | 'node_key'>[];
}

export default function Create({ project, scenes, characters, dialogues }: DialogueCreateProps) {
    return (
        <ProjectLayout
            title={__('New dialogue node')}
            actions={
                <Link href={`/projects/${project.id}/dialogues`} className="border border-border-strong px-4 py-2 text-sm hover:border-primary">
                    {__('Back')}
                </Link>
            }
        >
            <Head title={__('New dialogue node')} />
            <DialogueNodeForm projectId={project.id} scenes={scenes} characters={characters} dialogues={dialogues} submitLabel={__('Create node')} />
        </ProjectLayout>
    );
}
