import { __ } from '../../../shared/lib/i18n';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Grid2X2, List, Plus, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import ProjectCard from '../components/ProjectCard';
import SiteLayout from '../../../layouts/SiteLayout';
import { button } from '../../../shared/lib/styles';
import type { PageProps, Paginated, Project } from '../projects.types';

interface ProjectsIndexProps {
    projects: Paginated<Project>;
}

export default function Index({ projects }: ProjectsIndexProps) {
    const { props } = usePage<PageProps>();
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'favorites'>('all');
    const [list, setList] = useState(false);

    const visible = projects.data.filter(
        (project) => project.title.toLowerCase().includes(query.toLowerCase()) && (filter !== 'favorites' || project.favorite),
    );

    return (
        <SiteLayout>
            <Head title={__('My projects')} />
            <div className="mx-auto min-h-[78vh] max-w-[1400px] px-6 py-12 lg:px-16">
                <Link href="/" className="inline-flex items-center gap-2 text-xs text-subtle">
                    <ArrowLeft size={14} /> {__('Back to the GAMERDUST universe')}
                </Link>
                <div className="mt-9 flex flex-wrap items-end justify-between gap-6">
                    <div>
                        <span className="text-xs text-primary">{__('THE STUDIO / YOUR CREATIVE SPACE')}</span>
                        <h1 className="mt-3 font-display text-4xl md:text-5xl">
                            {__('Your worlds,')}{' '}
                            <span className="font-['Pixelify_Sans',monospace] font-bold tracking-normal text-primary">{__('expanding.')}</span>
                        </h1>
                        <p className="mt-4 text-sm text-subtle">{__('Every great video game starts with an idea. Continue yours.')}</p>
                    </div>
                    <Link href="/projects/create" className={button}>
                        <Plus size={17} /> {__('New project')}
                    </Link>
                </div>

                {props.flash?.success && (
                    <div className="mt-6 rounded border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">{props.flash.success}</div>
                )}

                <div className="mt-10 flex flex-wrap items-center justify-between gap-5 border-b border-border pb-4">
                    <div className="flex gap-7">
                        {(['all', 'favorites'] as const).map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setFilter(tab)}
                                className={`text-sm ${filter === tab ? 'text-primary' : 'text-subtle'}`}
                            >
                                {tab === 'all' ? __('All') : __('Favorites')}
                                {tab === 'all' && <span className="ml-2 rounded bg-surface-2 px-2 py-1 text-xs">{projects.total}</span>}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-3">
                        <label className="flex items-center gap-2 rounded border border-border px-3 py-2">
                            <Search size={15} className="text-subtle" />
                            <input
                                aria-label={__('Search projects')}
                                placeholder={__('Search for a world...')}
                                className="w-36 bg-transparent text-xs sm:w-48"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                            />
                        </label>
                        <button
                            type="button"
                            aria-label={__('Grid view')}
                            onClick={() => setList(false)}
                            className={`rounded p-2 ${!list ? 'bg-primary/10 text-primary' : 'text-subtle'}`}
                        >
                            <Grid2X2 size={18} />
                        </button>
                        <button
                            type="button"
                            aria-label={__('List view')}
                            onClick={() => setList(true)}
                            className={`rounded p-2 ${list ? 'bg-primary/10 text-primary' : 'text-subtle'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>

                <div className={`mt-7 grid gap-5 ${list ? 'grid-cols-1' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
                    {visible.map((project) => (
                        <ProjectCard key={project.id} project={project} list={list} />
                    ))}
                    {!list && !query && filter === 'all' && (
                        <Link
                            href="/projects/create"
                            className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border text-subtle transition hover:border-primary hover:text-primary"
                        >
                            <Plus size={28} strokeWidth={1} />
                            <span className="text-sm">{__('A new world to discover')}</span>
                            <span className="text-xs">{__('CREATE PROJECT')}</span>
                        </Link>
                    )}
                </div>

                {visible.length === 0 && <div className="py-20 text-center text-subtle">{__('No projects match your search.')}</div>}

                <Pagination links={projects.links} />

                <div className="mt-12 flex items-center gap-3 rounded-lg border border-primary/15 bg-primary/5 p-5">
                    <Sparkles size={20} className="text-primary" />
                    <p className="text-xs leading-5 text-muted">
                        <span className="text-primary">{__('Your imagination, amplified.')}</span> {__('Start with a premise. The rest of the universe will come later.')}
                    </p>
                </div>
            </div>
        </SiteLayout>
    );
}

function Pagination({ links }: { links: Paginated<Project>['links'] }) {
    if (links.length <= 3) return null;

    return (
        <div className="mt-8 flex flex-wrap gap-2">
            {links.map((link, index) =>
                link.url ? (
                    <Link
                        key={`${link.label}-${index}`}
                        href={link.url}
                        className={`rounded border px-3 py-2 text-sm ${link.active ? 'border-primary text-primary' : 'border-border text-muted hover:border-primary/50'}`}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ) : (
                    <span key={`${link.label}-${index}`} className="rounded border border-border px-3 py-2 text-sm text-subtle" dangerouslySetInnerHTML={{ __html: link.label }} />
                ),
            )}
        </div>
    );
}
