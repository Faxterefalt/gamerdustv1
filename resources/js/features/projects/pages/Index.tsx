import { __ } from '../../../shared/lib/i18n';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Grid2X2, List, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import ProjectCard from '../components/ProjectCard';
import SiteLayout from '../../../layouts/SiteLayout';
import { button, iconButton, pixelAccent } from '../../../shared/lib/styles';
import type { PageProps, Paginated, Project } from '../projects.types';

interface ProjectsIndexProps {
    projects: Paginated<Project>;
}

const tab = 'inline-flex min-h-11 items-center gap-2 border-b-2 text-sm transition-colors';

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
            <div className="mx-auto max-w-[1360px] px-4 pb-20 pt-8 sm:px-6 lg:px-16">
                <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-foreground">
                    <ArrowLeft size={16} aria-hidden="true" /> {__('Back to the GAMERDUST universe')}
                </Link>
                <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-bold tracking-[-0.015em]">
                            {__('Your worlds,')} <span className={pixelAccent}>{__('expanding.')}</span>
                        </h1>
                        <p className="mt-3 text-muted">{__('Every great video game starts with an idea. Continue yours.')}</p>
                    </div>
                    <Link href="/projects/create" className={button}>
                        <Plus size={18} aria-hidden="true" /> {__('New project')}
                    </Link>
                </div>

                {props.flash?.success && (
                    <p role="status" className="mt-6 rounded-md border border-success/50 bg-success/10 px-4 py-3 text-sm text-success">
                        {props.flash.success}
                    </p>
                )}

                <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-b border-border">
                    <div role="group" aria-label={__('Filter projects')} className="flex gap-6">
                        {(['all', 'favorites'] as const).map((value) => (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={filter === value}
                                onClick={() => setFilter(value)}
                                className={`${tab} ${filter === value ? 'border-primary text-foreground' : 'border-transparent text-muted hover:text-foreground'}`}
                            >
                                {value === 'all' ? __('All') : __('Favorites')}
                                {value === 'all' && <span className="font-pixel text-sm text-primary">{projects.total}</span>}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 pb-2">
                        <label className="flex min-h-10 items-center gap-2 rounded-md border border-border-strong bg-background px-3 focus-within:border-primary focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus pointer-coarse:min-h-11">
                            <Search size={16} aria-hidden="true" className="text-subtle" />
                            <input
                                type="search"
                                aria-label={__('Search projects')}
                                placeholder={__('Search for a world...')}
                                className="w-40 bg-transparent text-sm focus-visible:outline-none sm:w-56"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                            />
                        </label>
                        <div role="group" aria-label={__('View')} className="flex">
                            <button type="button" aria-label={__('Grid view')} aria-pressed={!list} onClick={() => setList(false)} className={`${iconButton} ${!list ? 'bg-surface-2 text-primary' : ''}`}>
                                <Grid2X2 size={18} />
                            </button>
                            <button type="button" aria-label={__('List view')} aria-pressed={list} onClick={() => setList(true)} className={`${iconButton} ${list ? 'bg-surface-2 text-primary' : ''}`}>
                                <List size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className={`mt-8 grid gap-5 ${list ? 'grid-cols-1' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
                    {visible.map((project) => (
                        <ProjectCard key={project.id} project={project} list={list} />
                    ))}
                    {!list && !query && filter === 'all' && (
                        <Link
                            href="/projects/create"
                            className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-strong p-6 text-center text-muted transition-colors hover:border-primary hover:text-foreground"
                        >
                            <Plus size={28} strokeWidth={1.5} aria-hidden="true" className="text-primary" />
                            <span className="font-bold text-foreground">{__('A new world to discover')}</span>
                            <span className="max-w-[28ch] text-sm">{__('Start with a premise. The rest of the universe will come later.')}</span>
                        </Link>
                    )}
                </div>

                {visible.length === 0 && (
                    <div className="mt-8 rounded-lg border border-border bg-surface px-6 py-12 text-center">
                        <p className="font-bold">{query ? __('No projects match your search.') : __('You have no favorite projects yet.')}</p>
                        <p className="mt-2 text-sm text-muted">{query ? __('Try another title or clear the search.') : __('Mark a project with the star to find it here.')}</p>
                    </div>
                )}

                <Pagination links={projects.links} />
            </div>
        </SiteLayout>
    );
}

function Pagination({ links }: { links: Paginated<Project>['links'] }) {
    if (links.length <= 3) return null;

    return (
        <nav aria-label={__('Pagination')} className="mt-10 flex flex-wrap gap-2">
            {links.map((link, index) =>
                link.url ? (
                    <Link
                        key={`${link.label}-${index}`}
                        href={link.url}
                        aria-current={link.active ? 'page' : undefined}
                        className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border px-3 text-sm ${link.active ? 'border-primary text-primary' : 'border-border text-muted hover:border-border-strong hover:text-foreground'}`}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ) : (
                    <span
                        key={`${link.label}-${index}`}
                        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-border px-3 text-sm text-subtle"
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ),
            )}
        </nav>
    );
}
