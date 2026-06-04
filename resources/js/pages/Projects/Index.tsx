import { Head, Link } from '@inertiajs/react';
import AppShell from '../../components/gamerdust/AppShell';
import ProjectCard from '../../components/gamerdust/ProjectCard';
import type { Paginated, Project } from '../../types/project';

interface ProjectsIndexProps {
    projects: Paginated<Project>;
}

export default function Index({ projects }: ProjectsIndexProps) {
    return (
        <AppShell
            title="Proyectos narrativos"
            actions={
                <Link href="/projects/create" className="border border-amber-600 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-950">
                    Nuevo proyecto
                </Link>
            }
        >
            <Head title="Proyectos" />
            {projects.data.length === 0 ? (
                <div className="border border-zinc-800 bg-zinc-900 p-8 text-center">
                    <h2 className="text-lg font-semibold text-white">Todavia no hay proyectos</h2>
                    <p className="mt-2 text-sm text-zinc-400">Crea el primer espacio narrativo de Gamerdust.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {projects.data.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                    ))}
                </div>
            )}
            <Pagination links={projects.links} />
        </AppShell>
    );
}

function Pagination({ links }: { links: Paginated<Project>['links'] }) {
    return (
        <div className="mt-6 flex flex-wrap gap-2">
            {links.map((link, index) =>
                link.url ? (
                    <Link
                        key={`${link.label}-${index}`}
                        href={link.url}
                        className={`border px-3 py-2 text-sm ${link.active ? 'border-amber-500 text-amber-200' : 'border-zinc-800 text-zinc-300 hover:border-zinc-600'}`}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ) : (
                    <span key={`${link.label}-${index}`} className="border border-zinc-900 px-3 py-2 text-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: link.label }} />
                ),
            )}
        </div>
    );
}
