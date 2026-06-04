import { Head, Link } from '@inertiajs/react';
import AppShell from '../../components/gamerdust/AppShell';
import CharacterForm from '../../components/gamerdust/CharacterForm';
import type { Character } from '../../types/character';
import type { Project } from '../../types/project';

interface CharacterEditProps {
    project: Project;
    character: Character;
}

export default function Edit({ project, character }: CharacterEditProps) {
    return (
        <AppShell
            title={`Editar ${character.name}`}
            actions={
                <Link href={`/projects/${project.id}/characters`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                    Volver
                </Link>
            }
        >
            <Head title={`Editar ${character.name}`} />
            <CharacterForm projectId={project.id} character={character} method="put" submitLabel="Guardar cambios" />
        </AppShell>
    );
}
