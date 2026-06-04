import { Head, Link } from '@inertiajs/react';
import AppShell from '../../components/gamerdust/AppShell';
import DialogueNodeForm from '../../components/gamerdust/DialogueNodeForm';
import type { Character } from '../../types/character';
import type { DialogueNode } from '../../types/dialogue';
import type { Project } from '../../types/project';
import type { Scene } from '../../types/scene';

interface DialogueCreateProps {
    project: Project;
    scenes: Pick<Scene, 'id' | 'title'>[];
    characters: Pick<Character, 'id' | 'name'>[];
    dialogues: Pick<DialogueNode, 'id' | 'node_key'>[];
}

export default function Create({ project, scenes, characters, dialogues }: DialogueCreateProps) {
    return (
        <AppShell
            title="Nuevo nodo de dialogo"
            actions={
                <Link href={`/projects/${project.id}/dialogues`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                    Volver
                </Link>
            }
        >
            <Head title="Nuevo nodo de dialogo" />
            <DialogueNodeForm projectId={project.id} scenes={scenes} characters={characters} dialogues={dialogues} submitLabel="Crear nodo" />
        </AppShell>
    );
}
