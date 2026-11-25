import { Head, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import Brand from '../../../layouts/components/Brand';
import LocaleSwitcher from '../../../layouts/components/LocaleSwitcher';
import { button, field } from '../../../shared/lib/styles';
import type { PageProps } from '../../projects/projects.types';

interface AuthShellProps {
    title: string;
    description: string;
    children: ReactNode;
}

/**
 * Marco común de las páginas de acceso: marca e idioma arriba, una columna estrecha alineada a la izquierda
 * con el título, el aviso flash (p. ej. "enlace enviado") y el formulario.
 */
export default function AuthShell({ title, description, children }: AuthShellProps) {
    const { flash } = usePage<PageProps>().props;

    return (
        <div className="min-h-dvh bg-background text-foreground">
            <Head title={title} />
            <header className="mx-auto flex h-(--header-h) max-w-[1360px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-16">
                <Brand />
                <LocaleSwitcher />
            </header>
            <main className="mx-auto w-full max-w-sm px-4 pb-20 pt-8 sm:pt-16">
                <h1 className="text-3xl font-bold">{title}</h1>
                <p className="mt-3 text-muted">{description}</p>
                {flash?.success && (
                    <p role="status" className="mt-6 rounded-md border border-success/50 bg-success/10 px-3 py-2 text-sm text-success">
                        {flash.success}
                    </p>
                )}
                {children}
            </main>
        </div>
    );
}

/** Campo de acceso: el margen superior de `field` lo pone la etiqueta. */
export const authInput = field.replace('mt-2 ', '');

export const authButton = `${button} w-full`;

/** Pie de enlaces bajo el formulario (crear cuenta, volver...). */
export const authLinks = 'mt-6 flex flex-wrap justify-between gap-x-4 text-sm';

export const authLink = 'inline-flex min-h-11 items-center text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary';

export function AuthField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-bold text-foreground">{label}</span>
            {children}
            {error && (
                <span role="alert" className="mt-1 block text-sm text-danger">
                    {error}
                </span>
            )}
        </label>
    );
}
