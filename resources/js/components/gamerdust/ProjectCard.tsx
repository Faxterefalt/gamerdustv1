import { Link, router } from '@inertiajs/react';
import type { Project } from '../../types/project';

interface ProjectCardProps {
    project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
    const destroy = () => {
        if (confirm(`Eliminar "${project.title}"?`)) {
            router.delete(`/projects/${project.id}`);
        }
    };

    return (
        <article className="border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <Link href={`/projects/${project.id}`} className="text-lg font-semibold text-white hover:text-amber-200">
                        {project.title}
                    </Link>
                    <p className="mt-1 text-sm text-zinc-400">{project.game_genre || 'Genero sin definir'}</p>
                </div>
                <span className="border border-zinc-700 px-2 py-1 text-xs text-zinc-300">{project.status}</span>
            </div>

            <p className="mt-4 line-clamp-3 text-sm text-zinc-300">{project.description || 'Sin descripcion todavia.'}</p>

            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs text-zinc-400">
                <span>Lore {project.lore_entries_count ?? 0}</span>
                <span>Pers. {project.characters_count ?? 0}</span>
                <span>Esc. {project.scenes_count ?? 0}</span>
                <span>Dial. {project.dialogue_nodes_count ?? 0}</span>
            </div>

            <div className="mt-4 flex gap-2">
                <Link href={`/projects/${project.id}/edit`} className="border border-zinc-700 px-3 py-2 text-sm hover:border-amber-500">
                    Editar
                </Link>
                <button type="button" onClick={destroy} className="border border-rose-800 px-3 py-2 text-sm text-rose-200 hover:bg-rose-950">
                    Eliminar
                </button>
            </div>
        </article>
    );
}
