import { Link, usePage } from '@inertiajs/react';
import { ChevronRight, Eye, Lock, Users } from 'lucide-react';
import { useCallback, useEffect, useState, type PropsWithChildren, type ReactNode } from 'react';
import type { PageProps } from '../features/projects/projects.types';
import useProjectAccess from '../shared/hooks/useProjectAccess';
import { __ } from '../shared/lib/i18n';
import Footer from './components/Footer';
import Header from './components/Header';
import ProjectSidebar, { activeSection, type WorkspaceProject } from './components/ProjectSidebar';

interface AppShellProps extends PropsWithChildren {
    title?: string;
    actions?: ReactNode;
    fullWidth?: boolean;
    /** Sin márgenes, título ni avisos: la página ocupa todo el área (p. ej. el editor de guion). */
    bare?: boolean;
}

const SIDEBAR_KEY = 'gamerdust.sidebar-expanded';

function workspaceProject(value: unknown): WorkspaceProject | null {
    const project = value as Partial<WorkspaceProject> | null | undefined;

    return project && typeof project.id === 'number' && typeof project.title === 'string' ? (project as WorkspaceProject) : null;
}

/**
 * Layout de las páginas autenticadas. Si la página recibe una prop `project`, se muestra dentro del
 * estudio de proyecto (sidebar + ruta); si no (p. ej. Cuenta), como página simple con pie.
 */
export default function ProjectLayout({ title, actions, fullWidth = false, bare = false, children }: AppShellProps) {
    const { props, url } = usePage<PageProps>();
    const project = workspaceProject(props.project);

    const content = (
        <>
            {(title || actions) && (
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {title && <h1 className="text-2xl font-semibold text-foreground">{title}</h1>}
                    {actions}
                </div>
            )}

            {props.flash.success && <div className="mb-5 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">{props.flash.success}</div>}

            {props.flash.error && <div className="mb-5 rounded-md border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">{props.flash.error}</div>}

            {children}
        </>
    );

    if (!project) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <Header />
                <main className={fullWidth ? 'px-4 py-4 sm:px-6' : 'mx-auto max-w-7xl px-4 py-6 sm:px-6'}>{content}</main>
                <Footer />
            </div>
        );
    }

    return (
        <WorkspaceShell project={project} url={url}>
            {bare ? children : <div className={fullWidth ? 'px-4 py-4 sm:px-6' : 'mx-auto max-w-[1350px] px-5 py-8 sm:px-8'}>{content}</div>}
        </WorkspaceShell>
    );
}

function WorkspaceShell({ project, url, children }: PropsWithChildren<{ project: WorkspaceProject; url: string }>) {
    const [expanded, setExpanded] = useState(() => {
        try {
            return localStorage.getItem(SIDEBAR_KEY) !== 'false';
        } catch {
            return true;
        }
    });
    const [mobileOpen, setMobileOpen] = useState(false);
    const [desktop, setDesktop] = useState(true);
    const section = activeSection(url, project.id);
    const access = useProjectAccess();
    const close = useCallback(() => setMobileOpen(false), []);

    useEffect(() => {
        const query = matchMedia('(min-width: 1024px)');
        const sync = () => setDesktop(query.matches);
        sync();
        query.addEventListener('change', sync);

        return () => query.removeEventListener('change', sync);
    }, []);

    const toggle = () => {
        if (matchMedia('(min-width: 1024px)').matches) {
            setExpanded((value) => {
                try {
                    localStorage.setItem(SIDEBAR_KEY, String(!value));
                } catch {
                    // Preferencia opcional: sin almacenamiento simplemente no se recuerda.
                }

                return !value;
            });
        } else {
            setMobileOpen(true);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header onToggleSidebar={toggle} sidebarExpanded={desktop ? expanded : mobileOpen} />
            <div className="flex min-h-[calc(100dvh-var(--header-h))]">
                <ProjectSidebar project={project} url={url} expanded={expanded} open={mobileOpen} onClose={close} />
                <main id="studio-content" className="min-w-0 flex-1">
                    <div className="flex h-(--crumb-h) items-center justify-between gap-4 border-b border-border px-5 sm:px-7">
                        <nav aria-label={__('Project breadcrumb')} className="flex min-w-0 items-center gap-2 text-xs sm:gap-3 sm:text-xs">
                            <Link href="/projects" className="hidden shrink-0 text-subtle hover:text-primary sm:inline">
                                {__('My projects')}
                            </Link>
                            <ChevronRight size={11} className="hidden shrink-0 text-subtle sm:block" />
                            <Link href={`/projects/${project.id}`} className="truncate text-muted hover:text-primary">
                                {project.title}
                            </Link>
                            <ChevronRight size={11} className="shrink-0 text-subtle" />
                            <span aria-current="page" className="shrink-0 text-primary">
                                {section ? __(section.label) : __('Project')}
                            </span>
                        </nav>
                        <span className="hidden shrink-0 items-center gap-2 text-xs text-subtle md:flex">
                            {access.is_owner ? (
                                <>
                                    <Lock size={12} /> {__('PRIVATE PROJECT')}
                                </>
                            ) : (
                                <>
                                    <Users size={12} /> {__('SHARED PROJECT')}
                                </>
                            )}
                        </span>
                    </div>
                    {/* Lector (HU 5): puede ver y exportar; el servidor rechaza cualquier cambio con 403. */}
                    {!access.can_update && (
                        <p role="status" className="flex items-center gap-2 border-b border-primary/50 bg-primary/10 px-5 py-2 text-xs text-foreground sm:px-7">
                            <Eye size={13} className="shrink-0" /> {__('Read-only access: you can view and export this project, but your changes will not be saved.')}
                        </p>
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
}
