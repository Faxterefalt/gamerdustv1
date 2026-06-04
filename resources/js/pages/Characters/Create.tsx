import { Head, Link } from '@inertiajs/react';
import AppShell from '../../components/gamerdust/AppShell';
import CharacterForm from '../../components/gamerdust/CharacterForm';
import type { Project } from '../../types/project';

interface CharacterCreateProps {
    project: Project;
}

export default function Create({ project }: CharacterCreateProps) {
    return (
        <AppShell
            title="Nuevo personaje"
            actions={
                <Link href={`/projects/${project.id}/characters`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                    Volver
                </Link>
            }
        >
            <Head title="Nuevo personaje" />
            <CharacterForm projectId={project.id} submitLabel="Crear personaje" />
        </AppShell>
    );
}
