import { Head, Link } from '@inertiajs/react';
import AppShell from '../../components/gamerdust/AppShell';
import ProjectForm from '../../components/gamerdust/ProjectForm';

export default function Create() {
    return (
        <AppShell
            title="Nuevo proyecto"
            actions={
                <Link href="/projects" className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                    Volver
                </Link>
            }
        >
            <Head title="Nuevo proyecto" />
            <ProjectForm action="/projects" submitLabel="Crear proyecto" />
        </AppShell>
    );
}
