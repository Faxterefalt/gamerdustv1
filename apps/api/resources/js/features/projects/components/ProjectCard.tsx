import { Link, router } from '@inertiajs/react';
import { ArrowUpRight, GitBranch, Star, Trash2 } from 'lucide-react';
import { imageForGenre } from '../../../shared/lib/styles';
import type { Project } from '../projects.types';

interface ProjectCardProps {
    project: Project;
    list: boolean;
}

export default function ProjectCard({ project, list }: ProjectCardProps) {
    const scenes = project.scenes_count ?? 0;
    const toggleFavorite = () => router.patch(`/projects/${project.id}/favorite`, {}, { preserveScroll: true });
    const destroy = () => {
        if (confirm(`Eliminar "${project.title}"?`)) {
            router.delete(`/projects/${project.id}`);
        }
    };

    return (
        <article className={`group overflow-hidden rounded-lg border border-border bg-[#171d16] transition hover:border-primary/50 ${list ? 'flex' : ''}`}>
            <Link href={`/projects/${project.id}`} className={`relative block overflow-hidden ${list ? 'w-36 shrink-0' : 'h-52 w-full'}`}>
                <img
                    src={imageForGenre(project.game_genre)}
                    alt={project.title}
                    className="h-full w-full object-cover brightness-75 transition duration-500 group-hover:scale-105"
                />
                <span className="absolute left-4 top-4 rounded border border-white/20 bg-black/40 px-2 py-1 font-mono text-[8px] uppercase tracking-wider">
                    {project.game_genre || 'Sin género'}
                </span>
            </Link>
            <div className="flex-1 p-5">
                <div className="flex items-center justify-between gap-3">
                    <Link href={`/projects/${project.id}`} className="font-display text-xl">
                        {project.title}
                    </Link>
                    <button
                        type="button"
                        aria-label={project.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                        onClick={toggleFavorite}
                    >
                        <Star size={16} className={project.favorite ? 'fill-primary text-primary' : 'text-[#74816b]'} />
                    </button>
                </div>
                <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-[#94a18a]">
                    {project.description || 'Un nuevo mundo espera su primera historia.'}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-[10px] text-[#74816b]">
                    <span className="flex gap-2">
                        <GitBranch size={13} />
                        {scenes} escenas
                    </span>
                    <span className="flex items-center gap-4">
                        <Link href={`/projects/${project.id}/edit`} className="hover:text-white">
                            Editar
                        </Link>
                        <button type="button" onClick={destroy} aria-label="Eliminar proyecto" className="hover:text-rose-300">
                            <Trash2 size={13} />
                        </button>
                        <Link href={`/projects/${project.id}`} className="flex items-center gap-2 text-primary">
                            Abrir mundo <ArrowUpRight size={14} />
                        </Link>
                    </span>
                </div>
            </div>
        </article>
    );
}
