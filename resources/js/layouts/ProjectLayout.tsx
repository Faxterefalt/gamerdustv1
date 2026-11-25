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
                <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
                    {title && <h1 className="max-w-full shrink-0 text-2xl font-bold text-foreground">{title}</h1>}
                    {actions}
                </div>
            )}

            {props.flash.success && (
                <p role="status" className="mb-5 rounded-md border border-success/50 bg-success/10 px-4 py-3 text-sm text-success">
                    {props.flash.success}
                </p>
            )}

            {props.flash.error && (
                <p role="alert" className="mb-5 rounded-md border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">
                    {props.flash.error}
                </p>
            )}

            {children}
        </>
    );

    if (!project) {
        return (
            <div className="min-h-dvh bg-background text-foreground">
                <Header />
                <main className={fullWidth ? 'px-4 py-4 sm:px-6' : 'mx-auto max-w-7xl px-4 py-6 sm:px-6'}>{content}</main>
                <Footer />
            </div>
        );
    }

    return (
        <WorkspaceShell project={project} url={url}>
            {bare ? children : <div className={fullWidth ? 'px-4 py-4 sm:px-6' : 'mx-auto max-w-[1360px] px-4 py-8 sm:px-8'}>{content}</div>}
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
        <div className="min-h-dvh bg-background text-foreground">
            <Header onToggleSidebar={toggle} sidebarExpanded={desktop ? expanded : mobileOpen} />
            <div className="flex min-h-[calc(100dvh-var(--header-h))]">
                <ProjectSidebar project={project} url={url} expanded={expanded} open={mobileOpen} onClose={close} />
                <main id="studio-content" className="min-w-0 flex-1">
                    <div className="flex h-(--crumb-h) items-center justify-between gap-4 border-b border-border px-4 sm:px-8">
                        <nav aria-label={__('Project breadcrumb')} className="flex min-w-0 items-center gap-2 text-sm">
                            <Link href="/projects" className="hidden shrink-0 text-muted hover:text-foreground sm:inline">
                                {__('My projects')}
                            </Link>
                            <ChevronRight size={14} aria-hidden="true" className="hidden shrink-0 text-subtle sm:block" />
                            <Link href={`/projects/${project.id}`} className="truncate text-muted hover:text-foreground">
                                {project.title}
                            </Link>
                            <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-subtle" />
                            <span aria-current="page" className="shrink-0 font-bold text-foreground">
                                {section ? __(section.label) : __('Project')}
                            </span>
                        </nav>
                        <span className="hidden shrink-0 items-center gap-2 text-sm text-muted md:flex">
                            {access.is_owner ? (
                                <>
                                    <Lock size={14} aria-hidden="true" /> {__('Private project')}
                                </>
                            ) : (
                                <>
                                    <Users size={14} aria-hidden="true" /> {__('Shared project')}
                                </>
                            )}
                        </span>
                    </div>
                    {/* Lector (HU 5): puede ver y exportar; el servidor rechaza cualquier cambio con 403. */}
                    {!access.can_update && (
                        <p role="status" className="flex items-center gap-2 border-b border-info/50 bg-info/10 px-4 py-2 text-sm text-foreground sm:px-8">
                            <Eye size={16} aria-hidden="true" className="shrink-0 text-info" /> {__('Read-only access: you can view and export this project, but your changes will not be saved.')}
                        </p>
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
}
