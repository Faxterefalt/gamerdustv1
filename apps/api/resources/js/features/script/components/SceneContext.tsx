import { Link } from '@inertiajs/react';
import { ChartNoAxesCombined, Check, FileText, MapPin, Plus, UserRound, Workflow, X } from 'lucide-react';
import { useId, useState } from 'react';
import { __ } from '../../../shared/lib/i18n';
import { secondary } from '../../../shared/lib/styles';
import type { ProjectComment } from '../../collaboration/collaboration.types';
import CommentsPanel from '../../collaboration/components/CommentsPanel';
import type { LocationReference, NamedReference } from '../script.types';

interface SceneContextProps {
    projectId: number;
    sceneId: number;
    characters: NamedReference[];
    locations: LocationReference[];
    comments: ProjectComment[];
    characterIds: number[];
    locationId: number | null;
    onChange: (characters: number[], location: number | null) => void;
    disabled: boolean;
}

/**
 * Panel lateral del editor: personajes y ubicación vinculados a la escena, accesos rápidos y comentarios.
 */
export default function SceneContext({ projectId, sceneId, characters, locations, comments, characterIds, locationId, onChange, disabled }: SceneContextProps) {
    const [tab, setTab] = useState<'context' | 'comments'>('context');
    const [picker, setPicker] = useState<'characters' | 'locations' | null>(null);
    const uid = useId();
    const selectedCharacters = characters.filter((character) => characterIds.includes(character.id));
    const location = locations.find((item) => item.id === locationId);
    const commentCount = comments.filter((comment) => comment.scene_id === sceneId).length;
    const base = `/projects/${projectId}`;
    const quickLink = `${secondary} w-full justify-start !min-h-9 !text-[10px]`;

    return (
        <div>
            <div role="tablist" aria-label={__('Scene information')} className="flex border-b border-border">
                {(
                    [
                        { key: 'context', label: __('Context') },
                        { key: 'comments', label: __('Comments') },
                    ] as const
                ).map(({ key, label }) => (
                    <button
                        key={key}
                        type="button"
                        id={`${uid}-${key}-tab`}
                        role="tab"
                        aria-selected={tab === key}
                        aria-controls={`${uid}-${key}-panel`}
                        onClick={() => setTab(key)}
                        className={`relative flex-1 px-2 py-4 text-[11px] transition ${
                            tab === key ? 'text-primary after:absolute after:inset-x-5 after:bottom-0 after:h-0.5 after:bg-primary' : 'text-[#97a98b] hover:text-foreground'
                        }`}
                    >
                        {label}
                        {key === 'comments' && commentCount > 0 && <span className="ml-1 text-[9px]">{commentCount}</span>}
                    </button>
                ))}
            </div>

            <div role="tabpanel" id={`${uid}-context-panel`} aria-labelledby={`${uid}-context-tab`} hidden={tab !== 'context'} className="p-5">
                <section className="border-b border-border pb-6">
                    <h2 className="mb-4 text-xs font-semibold">{__('Characters')}</h2>
                    <div className="flex flex-wrap gap-2">
                        {selectedCharacters.map((character) => (
                            <span key={character.id} className="inline-flex items-center gap-2 rounded border border-border bg-white/[.02] px-2.5 py-2 text-[11px] text-[#cfdbc5]">
                                <UserRound size={13} className="text-[#a1b590]" />
                                {character.name}
                                <button
                                    type="button"
                                    disabled={disabled}
                                    aria-label={__('Unlink :name', { name: character.name })}
                                    onClick={() =>
                                        onChange(
                                            characterIds.filter((id) => id !== character.id),
                                            locationId,
                                        )
                                    }
                                    className="text-[#8da180] hover:text-primary"
                                >
                                    <X size={12} />
                                </button>
                            </span>
                        ))}
                    </div>
                    {!selectedCharacters.length && <p className="mb-3 text-[10px] leading-6 text-[#98ac8b]">{__('No linked characters.')}</p>}
                    <button
                        type="button"
                        disabled={disabled}
                        aria-expanded={picker === 'characters'}
                        className={`${secondary} mt-3 w-full !min-h-9 border-dashed !px-2 !text-[10px]`}
                        onClick={() => setPicker(picker === 'characters' ? null : 'characters')}
                    >
                        <Plus size={13} /> {__('Link character')}
                    </button>
                    {picker === 'characters' && (
                        <div className="mt-3 rounded-md border border-primary/20 bg-background p-3">
                            {characters.map((character) => (
                                <label key={character.id} className="flex items-center gap-2 py-2 text-xs">
                                    <input
                                        type="checkbox"
                                        disabled={disabled}
                                        className="accent-[#c2e88d]"
                                        checked={characterIds.includes(character.id)}
                                        onChange={(event) =>
                                            onChange(event.target.checked ? [...characterIds, character.id] : characterIds.filter((id) => id !== character.id), locationId)
                                        }
                                    />
                                    {character.name}
                                </label>
                            ))}
                            {!characters.length && (
                                <p className="text-[10px] leading-6 text-[#a6ba98]">
                                    {__('Create a character first in the Narrative Bible.')}{' '}
                                    <Link href={`${base}/characters/create`} className="text-primary underline">
                                        {__('Create character')}
                                    </Link>
                                </p>
                            )}
                            <button type="button" onClick={() => setPicker(null)} className="mt-2 flex items-center gap-1.5 text-[10px] text-primary">
                                <Check size={12} /> {__('Done')}
                            </button>
                        </div>
                    )}
                </section>

                <section className="border-b border-border py-6">
                    <h2 className="mb-4 text-xs font-semibold">{__('Locations')}</h2>
                    {location ? (
                        <span className="flex items-center gap-2 text-[11px] text-[#c9d8bf]">
                            <MapPin size={15} className="shrink-0 text-[#9fb58f]" />
                            <span className="min-w-0 break-words">{location.title}</span>
                            <button
                                type="button"
                                disabled={disabled}
                                aria-label={__('Unlink location')}
                                className="ml-auto shrink-0 text-[#8da180] hover:text-primary"
                                onClick={() => onChange(characterIds, null)}
                            >
                                <X size={13} />
                            </button>
                        </span>
                    ) : (
                        <p className="text-[10px] leading-6 text-[#98ac8b]">{__('No linked location.')}</p>
                    )}
                    <button
                        type="button"
                        disabled={disabled}
                        aria-expanded={picker === 'locations'}
                        className={`${secondary} mt-3 w-full !min-h-9 border-dashed !px-2 !text-[10px]`}
                        onClick={() => setPicker(picker === 'locations' ? null : 'locations')}
                    >
                        <Plus size={13} /> {__('Link location')}
                    </button>
                    {picker === 'locations' && (
                        <div className="mt-3 rounded-md border border-primary/20 bg-background p-3">
                            {locations.map((item) => (
                                <label key={item.id} className="flex items-center gap-2 py-2 text-[11px]">
                                    <input
                                        type="radio"
                                        name={`${uid}-location`}
                                        checked={locationId === item.id}
                                        disabled={disabled}
                                        onChange={() => onChange(characterIds, item.id)}
                                        className="accent-[#c2e88d]"
                                    />
                                    {item.title}
                                </label>
                            ))}
                            {!locations.length && (
                                <p className="text-[10px] leading-6 text-[#a6ba98]">
                                    {__('Create a location first in the Narrative Bible.')}{' '}
                                    <Link href={`${base}/lore/create?type=location`} className="text-primary underline">
                                        {__('Create location')}
                                    </Link>
                                </p>
                            )}
                            <button type="button" onClick={() => setPicker(null)} className="mt-2 flex items-center gap-1.5 text-[10px] text-primary">
                                <Check size={12} /> {__('Done')}
                            </button>
                        </div>
                    )}
                </section>

                <section className="pt-6">
                    <h2 className="mb-4 text-xs font-semibold">{__('Quick access')}</h2>
                    <div className="space-y-2.5">
                        <Link href={`${base}/bible`} className={quickLink}>
                            <FileText size={14} />
                            {__('View brief')}
                        </Link>
                        <Link href={`${base}/scenes`} className={quickLink}>
                            <Workflow size={14} />
                            {__('View scenes')}
                        </Link>
                        <Link href={`${base}/analysis?scene=${sceneId}`} className={quickLink}>
                            <ChartNoAxesCombined size={14} />
                            {__('Scene analysis')}
                        </Link>
                    </div>
                </section>
                <p className="mt-7 border-t border-border pt-4 text-[9px] leading-5 text-[#98ac8b]">{__('References are saved together with the script when you press Save.')}</p>
            </div>

            <div role="tabpanel" id={`${uid}-comments-panel`} aria-labelledby={`${uid}-comments-tab`} hidden={tab !== 'comments'} className="p-5">
                <CommentsPanel key={sceneId} projectId={projectId} sceneId={sceneId} comments={comments} compact />
            </div>
        </div>
    );
}
