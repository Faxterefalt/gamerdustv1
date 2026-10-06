import { Head, Link } from '@inertiajs/react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import DialogueNodeForm from '../components/DialogueNodeForm';
import type { Character } from '../../characters/characters.types';
import type { DialogueNode } from '../dialogues.types';
import type { Project } from '../../projects/projects.types';
import type { Scene } from '../../scenes/scenes.types';

interface DialogueEditProps {
    project: Project;
    dialogue: DialogueNode;
    scenes: Pick<Scene, 'id' | 'title'>[];
    characters: Pick<Character, 'id' | 'name'>[];
    dialogues: Pick<DialogueNode, 'id' | 'node_key'>[];
}

export default function Edit({ project, dialogue, scenes, characters, dialogues }: DialogueEditProps) {
    return (
        <ProjectLayout
            title={`Editar ${dialogue.node_key}`}
            actions={
                <Link href={`/projects/${project.id}/dialogues`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                    Volver
                </Link>
            }
        >
            <Head title={`Editar ${dialogue.node_key}`} />
            <DialogueNodeForm
                projectId={project.id}
                dialogue={dialogue}
                scenes={scenes}
                characters={characters}
                dialogues={dialogues}
                method="put"
                submitLabel="Guardar cambios"
            />
        </ProjectLayout>
    );
}
