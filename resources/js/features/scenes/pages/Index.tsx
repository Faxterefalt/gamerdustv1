import { Head, Link } from '@inertiajs/react';
import { FileText, GitBranch, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import { PageHeading } from '../../../shared/components/ui';
import { __, choice } from '../../../shared/lib/i18n';
import { card, primarySm, secondary } from '../../../shared/lib/styles';
import type { Paginated, Project } from '../../projects/projects.types';
import SceneCard from '../components/SceneCard';
import type { Scene } from '../scenes.types';

interface ScenesIndexProps {
    project: Project;
    scenes: Paginated<Scene>;
}

export default function Index({ project, scenes }: ScenesIndexProps) {
    const [query, setQuery] = useState('');
    const filtered = scenes.data.filter((scene) => `${scene.title} ${scene.act ?? ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
    const acts = [...new Set(filtered.map((scene) => scene.act ?? ''))];

    return (
        <ProjectLayout>
            <Head title={`${__('Scenes')} - ${project.title}`} />
            <PageHeading
                title={__('Scenes')}
                description={__('Each scene is a step towards another world. Organize the journey of your story.')}
                action={
                    <div className="flex flex-wrap gap-2">
                        <Link href={`/projects/${project.id}/script`} className={secondary}>
                            <FileText size={14} /> {__('Script editor')}
                        </Link>
                        <Link href={`/projects/${project.id}/scenes/create`} className={primarySm}>
                            <Plus size={15} /> {__('New scene')}
                        </Link>
                    </div>
                }
            />

            <div className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
                <p className="flex items-center gap-2 text-xs text-muted">
                    <GitBranch size={15} className="text-primary" /> {choice(':count scene|:count scenes', scenes.total)}
                </p>
                <label className="flex items-center gap-2 rounded-md border border-border px-3">
                    <Search size={14} className="text-muted" />
                    <input
                        aria-label={__('Search scenes')}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={__('Search scene…')}
                        className="w-40 bg-transparent py-2.5 text-xs"
                    />
                </label>
            </div>

            <div className="space-y-8">
                {acts.map((act) => (
                    <section key={act || '__none'}>
                        <h2 className="mb-4 font-display text-base">{act || __('No act')}</h2>
                        <div className="grid gap-4 lg:grid-cols-2">
                            {filtered
                                .filter((scene) => (scene.act ?? '') === act)
                                .map((scene) => (
                                    <SceneCard key={scene.id} scene={scene} />
                                ))}
                        </div>
                    </section>
                ))}
            </div>

            {!filtered.length && (
                <div className={`${card} px-6 py-16 text-center`}>
                    <GitBranch size={30} className="mx-auto text-primary" />
                    <h2 className="mt-5 font-display text-xl">{query ? __('We could not find that scene.') : __('Your first scene starts here.')}</h2>
                    <p className="mt-3 text-xs leading-6 text-muted">{query ? __('Try another name or act.') : __('Add a scene and bring it to life from the Script editor.')}</p>
                </div>
            )}
        </ProjectLayout>
    );
}
