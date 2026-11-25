import { __, choice } from '../../../shared/lib/i18n';
import { Link, router } from '@inertiajs/react';
import { GitBranch, Star, Trash2, Users } from 'lucide-react';
import ProjectCover from '../../../shared/components/ProjectCover';
import { iconButton } from '../../../shared/lib/styles';
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
        <article className={`flex overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-border-strong ${list ? 'flex-row' : 'flex-col'}`}>
            <Link href={`/projects/${project.id}`} tabIndex={-1} aria-hidden="true" className={`block shrink-0 ${list ? 'w-28 sm:w-36' : 'h-32 w-full'}`}>
                <ProjectCover title={project.title} genre={project.game_genre} size={list ? 'sm' : 'lg'} className="h-full w-full" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold">
                            <Link href={`/projects/${project.id}`} className="hover:text-primary">
                                {project.title}
                            </Link>
                        </h2>
                        <p className="mt-1 text-sm text-muted">{project.game_genre ? genreLabel(project.game_genre) : __('No genre')}</p>
                    </div>
                    <button
                        type="button"
                        aria-label={project.favorite ? __('Remove from favorites') : __('Add to favorites')}
                        aria-pressed={Boolean(project.favorite)}
                        onClick={toggleFavorite}
                        className={`${iconButton} -mr-2 -mt-2`}
                    >
                        <Star size={18} className={project.favorite ? 'fill-primary text-primary' : ''} />
                    </button>
                </div>
                {project.owner && (
                    <p className="mt-2 flex items-center gap-2 text-sm text-info">
                        <Users size={14} aria-hidden="true" />
                        <span>
                            {__('Shared by :name', { name: project.owner })} <span className="ml-1 rounded-sm border border-info/50 px-1.5 text-xs">{__(ROLE_LABELS[project.role ?? 'viewer'])}</span>
                        </span>
                    </p>
                )}
                <p className="mb-4 mt-3 line-clamp-2 text-sm text-muted">{project.description || __('A new world awaits its first story.')}</p>
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
                    <span className="flex items-center gap-2 text-muted">
                        <GitBranch size={15} aria-hidden="true" />
                        {choice(':count scene|:count scenes', scenes)}
                    </span>
                    <span className="flex items-center gap-1">
                        {canEdit && (
                            <Link href={`/projects/${project.id}/edit`} className="inline-flex min-h-10 items-center px-2 text-muted hover:text-foreground pointer-coarse:min-h-11">
                                {__('Edit')}
                            </Link>
                        )}
                        {isOwner && (
                            <button type="button" onClick={destroy} aria-label={__('Delete project')} className={`${iconButton} hover:text-danger`}>
                                <Trash2 size={16} />
                            </button>
                        )}
                        <Link href={`/projects/${project.id}`} className="inline-flex min-h-10 items-center px-2 font-bold text-primary hover:text-primary-hover pointer-coarse:min-h-11">
                            {__('Open world')}
                        </Link>
                    </span>
                </div>
            </div>
        </article>
    );
}
