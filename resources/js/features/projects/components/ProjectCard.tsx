import { __, choice } from '../../../shared/lib/i18n';
import { Link, router } from '@inertiajs/react';
import { ArrowUpRight, GitBranch, Star, Trash2, Users } from 'lucide-react';
import ProjectCover from '../../../shared/components/ProjectCover';
import { genreLabel } from '../projectOptions';
import { ROLE_LABELS } from '../../collaboration/components/MembersPanel';
import type { Project } from '../projects.types';

interface ProjectCardProps {
    project: Project;
    list: boolean;
}

export default function ProjectCard({ project, list }: ProjectCardProps) {
    const scenes = project.scenes_count ?? 0;
    // Solo dueño y admin/editor editan; solo el dueño borra (HU 5).
    const isOwner = (project.role ?? 'owner') === 'owner';
    const canEdit = isOwner || project.role === 'admin' || project.role === 'editor';
    const toggleFavorite = () => router.patch(`/projects/${project.id}/favorite`, {}, { preserveScroll: true });
    const destroy = () => {
        if (confirm(__('Delete ":name"?', { name: project.title }))) {
            router.delete(`/projects/${project.id}`);
        }
    };

    return (
        <article className={`group overflow-hidden rounded-lg border border-border bg-surface transition hover:border-primary/50 ${list ? 'flex' : ''}`}>
            <Link href={`/projects/${project.id}`} className={`relative block overflow-hidden ${list ? 'w-36 shrink-0' : 'h-52 w-full'}`}>
                <ProjectCover title={project.title} genre={project.game_genre} className="h-full w-full" />
                <span className="absolute left-4 top-4 rounded border border-border bg-background/40 px-2 py-1 text-xs">
                    {project.game_genre ? genreLabel(project.game_genre) : __('No genre')}
                </span>
            </Link>
            <div className="flex-1 p-5">
                <div className="flex items-center justify-between gap-3">
                    <Link href={`/projects/${project.id}`} className="font-display text-xl">
                        {project.title}
                    </Link>
                    <button
                        type="button"
                        aria-label={project.favorite ? __('Remove from favorites') : __('Add to favorites')}
                        onClick={toggleFavorite}
                    >
                        <Star size={16} className={project.favorite ? 'fill-primary text-primary' : 'text-subtle'} />
                    </button>
                </div>
                {project.owner && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-primary">
                        <Users size={11} /> {__('Shared by :name · :role', { name: project.owner, role: __(ROLE_LABELS[project.role ?? 'viewer']) })}
                    </p>
                )}
                <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-subtle">
                    {project.description || __('A new world awaits its first story.')}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-subtle">
                    <span className="flex gap-2">
                        <GitBranch size={13} />
                        {choice(':count scene|:count scenes', scenes)}
                    </span>
                    <span className="flex items-center gap-4">
                        {canEdit && (
                            <Link href={`/projects/${project.id}/edit`} className="hover:text-foreground">
                                {__('Edit')}
                            </Link>
                        )}
                        {isOwner && (
                            <button type="button" onClick={destroy} aria-label={__('Delete project')} className="hover:text-danger">
                                <Trash2 size={13} />
                            </button>
                        )}
                        <Link href={`/projects/${project.id}`} className="flex items-center gap-2 text-primary">
                            {__('Open world')} <ArrowUpRight size={14} />
                        </Link>
                    </span>
                </div>
            </div>
        </article>
    );
}
