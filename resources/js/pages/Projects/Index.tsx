import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Grid2X2, List, Plus, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import ProjectCard from '../../components/gamerdust/ProjectCard';
import SiteLayout from '../../components/site/SiteLayout';
import { button } from '../../lib/styles';
import type { PageProps, Paginated, Project } from '../../types/project';

interface ProjectsIndexProps {
    projects: Paginated<Project>;
}

export default function Index({ projects }: ProjectsIndexProps) {
    const { props } = usePage<PageProps>();
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<'Todos' | 'Favoritos'>('Todos');
    const [list, setList] = useState(false);

    const visible = projects.data.filter(
        (project) => project.title.toLowerCase().includes(query.toLowerCase()) && (filter !== 'Favoritos' || project.favorite),
    );

    return (
        <SiteLayout>
            <Head title="Mis proyectos" />
            <div className="mx-auto min-h-[78vh] max-w-[1400px] px-6 py-12 lg:px-16">
                <Link href="/" className="inline-flex items-center gap-2 text-xs text-[#89967f]">
                    <ArrowLeft size={14} /> Volver al universo GAMERDUST
                </Link>
                <div className="mt-9 flex flex-wrap items-end justify-between gap-6">
                    <div>
                        <span className="font-mono text-[10px] tracking-[.16em] text-primary">EL ESTUDIO / TU ESPACIO CREATIVO</span>
                        <h1 className="mt-3 font-display text-4xl md:text-5xl">
                            Tus mundos,{' '}
                            <span className="font-['Pixelify_Sans',monospace] font-bold tracking-normal text-primary">en expansión.</span>
                        </h1>
                        <p className="mt-4 text-sm text-[#98a58e]">Todo gran videojuego empieza con una idea. Continúa la tuya.</p>
                    </div>
                    <Link href="/projects/create" className={button}>
                        <Plus size={17} /> Nuevo proyecto
                    </Link>
                </div>

                {props.flash?.success && (
                    <div className="mt-6 rounded border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">{props.flash.success}</div>
                )}

                <div className="mt-10 flex flex-wrap items-center justify-between gap-5 border-b border-border pb-4">
                    <div className="flex gap-7">
                        {(['Todos', 'Favoritos'] as const).map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setFilter(tab)}
                                className={`text-sm ${filter === tab ? 'text-primary' : 'text-[#8f9c86]'}`}
                            >
                                {tab}
                                {tab === 'Todos' && <span className="ml-2 rounded bg-white/5 px-2 py-1 text-[10px]">{projects.total}</span>}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-3">
                        <label className="flex items-center gap-2 rounded border border-border px-3 py-2">
                            <Search size={15} className="text-[#8f9c86]" />
                            <input
                                aria-label="Buscar proyectos"
                                placeholder="Buscar un mundo..."
                                className="w-36 bg-transparent text-xs outline-none sm:w-48"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                            />
                        </label>
                        <button
                            type="button"
                            aria-label="Vista de cuadrícula"
                            onClick={() => setList(false)}
                            className={`rounded p-2 ${!list ? 'bg-primary/10 text-primary' : 'text-[#8f9c86]'}`}
                        >
                            <Grid2X2 size={18} />
                        </button>
                        <button
                            type="button"
                            aria-label="Vista de lista"
                            onClick={() => setList(true)}
                            className={`rounded p-2 ${list ? 'bg-primary/10 text-primary' : 'text-[#8f9c86]'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>

                <div className={`mt-7 grid gap-5 ${list ? 'grid-cols-1' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
                    {visible.map((project) => (
                        <ProjectCard key={project.id} project={project} list={list} />
                    ))}
                    {!list && !query && filter === 'Todos' && (
                        <Link
                            href="/projects/create"
                            className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-[#3e4a35] text-[#839378] transition hover:border-primary hover:text-primary"
                        >
                            <Plus size={28} strokeWidth={1} />
                            <span className="text-sm">Un nuevo mundo por descubrir</span>
                            <span className="font-mono text-[9px]">CREAR PROYECTO</span>
                        </Link>
                    )}
                </div>

                {visible.length === 0 && <div className="py-20 text-center text-[#98a58e]">No hay proyectos que coincidan con tu búsqueda.</div>}

                <Pagination links={projects.links} />

                <div className="mt-12 flex items-center gap-3 rounded-lg border border-primary/15 bg-primary/5 p-5">
                    <Sparkles size={20} className="text-primary" />
                    <p className="text-xs leading-5 text-[#aab79f]">
                        <span className="text-primary">Tu imaginación, amplificada.</span> Empieza por una premisa. El resto del universo llegará después.
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
                        className={`rounded border px-3 py-2 text-sm ${link.active ? 'border-primary text-primary' : 'border-border text-[#afb5ac] hover:border-primary/50'}`}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ) : (
                    <span key={`${link.label}-${index}`} className="rounded border border-border px-3 py-2 text-sm text-[#555e50]" dangerouslySetInnerHTML={{ __html: link.label }} />
                ),
            )}
        </div>
    );
}
