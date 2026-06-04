import { Link, usePage } from '@inertiajs/react';
import type { PropsWithChildren, ReactNode } from 'react';
import type { PageProps } from '../../types/project';

interface AppShellProps extends PropsWithChildren {
    title?: string;
    actions?: ReactNode;
}

export default function AppShell({ title, actions, children }: AppShellProps) {
    const { props } = usePage<PageProps>();

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            <header className="border-b border-zinc-800 bg-zinc-950/95">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="flex items-center gap-5">
                        <Link href="/projects" className="text-lg font-semibold text-amber-300">
                            Gamerdust
                        </Link>
                        <nav className="flex items-center gap-3 text-sm text-zinc-300">
                            <Link href="/projects" className="hover:text-white">
                                Proyectos
                            </Link>
                        </nav>
                    </div>
                    <div className="text-sm text-zinc-400">{props.auth.user?.name ?? 'Sesion local'}</div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
                {(title || actions) && (
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        {title && <h1 className="text-2xl font-semibold text-white">{title}</h1>}
                        {actions}
                    </div>
                )}

                {props.flash.success && (
                    <div className="mb-5 border border-emerald-700 bg-emerald-950/60 px-4 py-3 text-sm text-emerald-100">
                        {props.flash.success}
                    </div>
                )}

                {props.flash.error && (
                    <div className="mb-5 border border-rose-700 bg-rose-950/60 px-4 py-3 text-sm text-rose-100">
                        {props.flash.error}
                    </div>
                )}

                {children}
            </main>
        </div>
    );
}
