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
        <main className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
            <Head title={title} />
            <section className="mx-auto max-w-md border border-zinc-800 bg-zinc-900 p-6">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-semibold text-white">{title}</h1>
                    <LocaleSwitcher />
                </div>
                <p className="mt-2 text-sm text-zinc-400">{description}</p>
                {flash?.success && (
                    <p role="status" className="mt-5 border border-emerald-700 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-100">
                        {flash.success}
                    </p>
                )}
                {children}
            </section>
        </main>
    );
}

export const authInput = 'w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500';

export const authButton = 'w-full border border-amber-600 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-950 disabled:opacity-50';

export function AuthField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">{label}</span>
            {children}
            {error && <span className="mt-1 block text-sm text-rose-300">{error}</span>}
        </label>
    );
}
