import { __ } from '../../../shared/lib/i18n';
import { Link, router } from '@inertiajs/react';
import type { Character } from '../characters.types';

interface CharacterCardProps {
    character: Character;
}

export default function CharacterCard({ character }: CharacterCardProps) {
    const destroy = () => {
        if (confirm(__('Delete ":name"?', { name: character.name }))) {
            router.delete(`/projects/${character.project_id}/characters/${character.id}`);
        }
    };

    return (
        <article className="border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="font-semibold text-white">{character.name}</h3>
                    <p className="text-sm text-zinc-400">{character.role || __('Role not defined')}</p>
                </div>
                {character.archetype && <span className="border border-indigo-800 bg-indigo-950/50 px-2 py-1 text-xs text-indigo-200">{character.archetype}</span>}
            </div>
            <p className="mt-3 text-sm text-zinc-300">{character.motivation || character.background || __('No motivation or background yet.')}</p>
            <div className="mt-4 flex gap-2">
                <Link href={`/projects/${character.project_id}/characters/${character.id}/edit`} className="border border-zinc-700 px-3 py-2 text-sm hover:border-amber-500">
                    {__('Edit')}
                </Link>
                <button type="button" onClick={destroy} className="border border-rose-800 px-3 py-2 text-sm text-rose-200 hover:bg-rose-950">
                    {__('Delete')}
                </button>
            </div>
        </article>
    );
}
