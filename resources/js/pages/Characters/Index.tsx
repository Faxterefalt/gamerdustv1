import { Head, Link } from '@inertiajs/react';
import AppShell from '../../components/gamerdust/AppShell';
import CharacterCard from '../../components/gamerdust/CharacterCard';
import type { Character } from '../../types/character';
import type { Paginated, Project } from '../../types/project';

interface CharactersIndexProps {
    project: Project;
    characters: Paginated<Character>;
}

export default function Index({ project, characters }: CharactersIndexProps) {
    return (
        <AppShell
            title={`Personajes - ${project.title}`}
            actions={
                <div className="flex gap-2">
                    <Link href={`/projects/${project.id}`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                        Panel
                    </Link>
                    <Link href={`/projects/${project.id}/characters/create`} className="border border-amber-600 px-4 py-2 text-sm text-amber-100 hover:bg-amber-950">
                        Nuevo personaje
                    </Link>
                </div>
            }
        >
            <Head title={`Personajes - ${project.title}`} />
            <div className="grid gap-4 lg:grid-cols-2">
                {characters.data.map((character) => (
                    <CharacterCard key={character.id} character={character} />
                ))}
            </div>
        </AppShell>
    );
}
