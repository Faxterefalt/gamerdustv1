import { Link } from '@inertiajs/react';
import { ArrowLeft, BookOpen, ChevronRight, File, FileText, GitBranch, House, Lock, Settings2, Sparkles, Users, Workflow, X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { genreLabel } from '../../features/projects/projectOptions';
import { __ } from '../../shared/lib/i18n';
import { imageForGenre } from '../../shared/lib/styles';

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
            <div className="px-5 pb-7 pt-6">
                <div className="flex items-center justify-between">
                    <Link href="/projects" onClick={onClose} className="flex items-center gap-2 text-xs text-[#a0b093] hover:text-primary">
                        <ArrowLeft size={14} /> {__('All projects')}
                    </Link>
                    {mobile && (
                        <button type="button" autoFocus aria-label={__('Close project menu')} onClick={onClose} className="rounded p-2 text-[#aebea3] hover:bg-white/5">
                            <X size={18} />
                        </button>
                    )}
                </div>
                <div className="mt-7 flex items-center gap-3 rounded-lg border border-border bg-white/[.025] p-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-primary/10">
                        <img src={imageForGenre(project.game_genre)} alt="" className="h-full w-full object-cover brightness-75" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium">{project.title}</p>
                        <p className="mt-1 truncate text-[10px] text-[#9cab91]">{project.game_genre ? genreLabel(project.game_genre) : __('No genre')}</p>
                    </div>
                </div>
            </div>

            <nav aria-label={__('Project sections')} className="min-h-0 flex-1 overflow-y-auto px-3 pb-5">
                <p className="mb-4 px-3 font-mono text-[9px] tracking-[.16em] text-[#8e9e83]">{__('YOUR CREATIVE UNIVERSE')}</p>
                <div className="space-y-1.5">
                    {PROJECT_SECTIONS.map((section) => {
                        const Icon = section.icon;
                        const current = section === active;

                        return (
                            <Link
                                key={section.path}
                                href={`/projects/${project.id}${section.path}`}
                                onClick={onClose}
                                aria-current={current ? 'page' : undefined}
                                className={`relative flex min-h-12 items-center gap-3.5 rounded-md px-4 text-[13px] transition ${
                                    current
                                        ? 'bg-primary/10 font-medium text-primary before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full before:bg-primary'
                                        : 'text-[#b0bca7] hover:bg-white/[.04] hover:text-white'
                                }`}
                            >
                                <Icon size={19} strokeWidth={1.6} />
                                {__(section.label)}
                                {current && <ChevronRight size={13} className="ml-auto" />}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <div className="mx-5 mb-5 border-t border-border pt-5">
                <p className="flex items-center gap-2 text-[11px] text-[#b1c1a6]">
                    <Lock size={14} className="text-primary" />
                    {__('Private project')}
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary/70" />
                </p>
                <p className="mt-2 text-[10px] leading-5 text-[#8a9a7f]">{__('Saved on your server. Only you can see and edit it.')}</p>
            </div>
        </div>
    );

    return (
        <>
            <aside
                id="desktop-project-sidebar"
                aria-label={__('Project menu')}
                className={`${expanded ? 'hidden lg:block' : 'hidden'} sticky top-[88px] h-[calc(100dvh-88px)] w-[238px] shrink-0 border-r border-border bg-[#131914]`}
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
                className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[280px] max-w-[calc(100vw-32px)] border-0 border-r border-border bg-[#131914] p-0 text-foreground shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm lg:hidden"
            >
                {contents(true)}
            </dialog>
        </>
    );
}
