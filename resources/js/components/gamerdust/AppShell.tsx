import { usePage } from '@inertiajs/react';
import type { PropsWithChildren, ReactNode } from 'react';
import type { PageProps } from '../../types/project';
import Footer from '../site/Footer';
import Header from '../site/Header';

interface AppShellProps extends PropsWithChildren {
    title?: string;
    actions?: ReactNode;
}

export default function AppShell({ title, actions, children }: AppShellProps) {
    const { props } = usePage<PageProps>();

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header />

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
            <Footer />
        </div>
    );
}
