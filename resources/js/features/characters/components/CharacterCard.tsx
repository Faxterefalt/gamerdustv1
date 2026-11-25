import { __ } from '../../../shared/lib/i18n';
import { Link, router } from '@inertiajs/react';
import type { Character } from '../characters.types';
import { dangerButton, secondary } from '../../../shared/lib/styles';

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
        <article className="border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="font-semibold text-foreground">{character.name}</h3>
                    <p className="text-sm text-muted">{character.role || __('Role not defined')}</p>
                </div>
                {character.archetype && <span className="border border-ember/50 bg-ember/10 px-2 py-1 text-xs text-ember">{character.archetype}</span>}
            </div>
            <p className="mt-3 text-sm text-muted">{character.motivation || character.background || __('No motivation or background yet.')}</p>
            <div className="mt-4 flex gap-2">
                <Link href={`/projects/${character.project_id}/characters/${character.id}/edit`} className={secondary}>
                    {__('Edit')}
                </Link>
                <button type="button" onClick={destroy} className={dangerButton}>
                    {__('Delete')}
                </button>
            </div>
        </article>
    );
}
