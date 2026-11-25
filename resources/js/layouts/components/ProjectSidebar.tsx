import { Link } from '@inertiajs/react';
import { ArrowLeft, BookOpen, File, FileText, GitBranch, House, Lock, Settings2, Sparkles, Users, Workflow, X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { genreLabel } from '../../features/projects/projectOptions';
import { __ } from '../../shared/lib/i18n';
import ProjectCover from '../../shared/components/ProjectCover';
import useProjectAccess from '../../shared/hooks/useProjectAccess';
import { iconButton } from '../../shared/lib/styles';

export interface WorkspaceProject {
    id: number;
    title: string;
    game_genre?: string | null;
}

interface Section {
    /** Ruta relativa a /projects/{id}. */
    path: string;
    /** Clave de traducción. */
    label: string;
    icon: LucideIcon;
    /** Otras rutas que también activan la sección (p. ej. las páginas clásicas de personajes y lore). */
    also?: string[];
}

export const PROJECT_SECTIONS: Section[] = [
    { path: '', label: 'Dashboard', icon: House, also: ['/edit'] },
    { path: '/bible', label: 'Narrative Bible', icon: BookOpen, also: ['/characters', '/lore'] },
    { path: '/script', label: 'Script', icon: FileText },
    { path: '/scenes', label: 'Scenes', icon: Workflow },
    { path: '/branching', label: 'Dialogues', icon: GitBranch, also: ['/dialogues'] },
    { path: '/mechanics', label: 'Mechanics', icon: Settings2 },
    { path: '/collaboration', label: 'Collaboration', icon: Users },
    { path: '/analysis', label: 'AI Analysis', icon: Sparkles },
    { path: '/reports', label: 'Reports', icon: File },
];

export function activeSection(url: string, projectId: number): Section | undefined {
    const base = `/projects/${projectId}`;
    const path = url.split(/[?#]/)[0].replace(/\/+$/, '');

    if (!path.startsWith(base)) {
        return undefined;
    }

    const rest = path.slice(base.length);
    const matches = (prefix: string) => rest === prefix || rest.startsWith(`${prefix}/`);

    return PROJECT_SECTIONS.find((section) => rest === section.path || (section.path !== '' && matches(section.path)) || section.also?.some(matches));
}

interface ProjectSidebarProps {
    project: WorkspaceProject;
    url: string;
    expanded: boolean;
    open: boolean;
    onClose: () => void;
}

/**
 * Navegación del estudio de proyecto: columna fija en escritorio (plegable) y <dialog> lateral en móvil.
 */
export default function ProjectSidebar({ project, url, expanded, open, onClose }: ProjectSidebarProps) {
    const dialog = useRef<HTMLDialogElement>(null);
    const active = activeSection(url, project.id);
    const access = useProjectAccess();

    useEffect(() => {
        if (!open) {
            return;
        }

        const element = dialog.current!;
        element.showModal();
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const breakpoint = matchMedia('(min-width: 1024px)');
        const closeOnDesktop = () => {
            if (breakpoint.matches) onClose();
        };
        breakpoint.addEventListener('change', closeOnDesktop);

        return () => {
            element.close();
            document.body.style.overflow = previous;
            breakpoint.removeEventListener('change', closeOnDesktop);
        };
    }, [open, onClose]);

    const contents = (mobile: boolean) => (
        <div className="flex h-full flex-col">
            <div className="px-4 pb-6 pt-4">
                <div className="flex items-center justify-between">
                    <Link href="/projects" onClick={onClose} className="inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-foreground">
                        <ArrowLeft size={16} aria-hidden="true" /> {__('All projects')}
                    </Link>
                    {mobile && (
                        <button type="button" autoFocus aria-label={__('Close project menu')} onClick={onClose} className={iconButton}>
                            <X size={18} />
                        </button>
                    )}
                </div>
                <div className="mt-3 flex items-center gap-3 rounded-lg bg-surface-2 p-3">
                    <ProjectCover title={project.title} genre={project.game_genre} size="sm" className="size-10 shrink-0 rounded-md" />
                    <div className="min-w-0">
                        <p className="truncate font-bold">{project.title}</p>
                        <p className="truncate text-sm text-muted">{project.game_genre ? genreLabel(project.game_genre) : __('No genre')}</p>
                    </div>
                </div>
            </div>

            <nav aria-label={__('Project sections')} className="min-h-0 flex-1 overflow-y-auto px-3 pb-5">
                <div className="space-y-1">
                    {PROJECT_SECTIONS.map((section) => {
                        const Icon = section.icon;
                        const current = section === active;

                        return (
                            <Link
                                key={section.path}
                                href={`/projects/${project.id}${section.path}`}
                                onClick={onClose}
                                aria-current={current ? 'page' : undefined}
                                className={`relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                                    current
                                        ? 'bg-surface-3 font-bold text-foreground before:absolute before:inset-y-2.5 before:left-0 before:w-1 before:rounded-full before:bg-primary'
                                        : 'text-muted hover:bg-surface-2 hover:text-foreground'
                                }`}
                            >
                                <Icon size={18} strokeWidth={1.75} aria-hidden="true" className={current ? 'text-primary' : ''} />
                                {__(section.label)}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <div className="mx-4 mb-4 border-t border-border pt-4">
                <p className="flex items-center gap-2 text-sm text-muted">
                    {access.is_owner ? <Lock size={16} aria-hidden="true" className="text-primary" /> : <Users size={16} aria-hidden="true" className="text-info" />}
                    {access.is_owner ? __('Private project') : __('Shared project')}
                </p>
                {access.is_owner && <p className="mt-1 text-xs text-subtle">{__('Saved on your server. Only you can see and edit it.')}</p>}
            </div>
        </div>
    );

    return (
        <>
            <aside
                id="desktop-project-sidebar"
                aria-label={__('Project menu')}
                className={`${expanded ? 'hidden lg:block' : 'hidden'} sticky top-(--header-h) h-[calc(100dvh-var(--header-h))] w-60 shrink-0 border-r border-border bg-surface`}
            >
                {contents(false)}
            </aside>
            <dialog
                ref={dialog}
                id="mobile-project-sidebar"
                aria-label={__('Project menu')}
                onCancel={onClose}
                onClick={(event) => {
                    if (event.target === event.currentTarget) onClose();
                }}
                className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[calc(100%-2rem)] border-0 border-r border-border bg-surface p-0 text-foreground backdrop:bg-scrim lg:hidden"
            >
                {contents(true)}
            </dialog>
        </>
    );
}
