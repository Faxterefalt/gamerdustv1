import { Head, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import LocaleSwitcher from '../../../layouts/components/LocaleSwitcher';
import type { PageProps } from '../../projects/projects.types';

interface AuthShellProps {
    title: string;
    description: string;
    children: ReactNode;
}

/** Marco común de las páginas de acceso: título, idioma y aviso flash (p. ej. "enlace enviado"). */
export default function AuthShell({ title, description, children }: AuthShellProps) {
    const { flash } = usePage<PageProps>().props;

    return (
        <main className="min-h-screen bg-background px-4 py-10 text-foreground">
            <Head title={title} />
            <section className="mx-auto max-w-md border border-border bg-surface p-6">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
                    <LocaleSwitcher />
                </div>
                <p className="mt-2 text-sm text-muted">{description}</p>
                {flash?.success && (
                    <p role="status" className="mt-5 border border-success/50 bg-success/10 px-3 py-2 text-sm text-success">
                        {flash.success}
                    </p>
                )}
                {children}
            </section>
        </main>
    );
}

export const authInput = 'w-full border border-border-strong bg-background px-3 py-2 text-sm text-foreground focus:border-primary';

export const authButton = 'w-full border border-primary px-4 py-2 text-sm font-medium text-foreground hover:bg-primary/10 disabled:opacity-50';

export function AuthField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-foreground">{label}</span>
            {children}
            {error && <span className="mt-1 block text-sm text-danger">{error}</span>}
        </label>
    );
}
