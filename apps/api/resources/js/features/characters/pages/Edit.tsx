import { __ } from '../../../shared/lib/i18n';
import { Head, Link } from '@inertiajs/react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import CharacterForm from '../components/CharacterForm';
import type { Character } from '../characters.types';
import type { Project } from '../../projects/projects.types';

interface CharacterEditProps {
    project: Project;
    character: Character;
}

export default function Edit({ project, character }: CharacterEditProps) {
    return (
        <ProjectLayout
            title={__('Edit :name', { name: character.name })}
            actions={
                <Link href={`/projects/${project.id}/characters`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                    {__('Back')}
                </Link>
            }
        >
            <Head title={__('Edit :name', { name: character.name })} />
            <CharacterForm projectId={project.id} character={character} method="put" submitLabel={__('Save changes')} />
        </ProjectLayout>
    );
}
