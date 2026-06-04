import { Head, Link } from '@inertiajs/react';
import AppShell from '../../components/gamerdust/AppShell';
import SceneForm from '../../components/gamerdust/SceneForm';
import type { Project } from '../../types/project';
import type { Scene } from '../../types/scene';

interface SceneEditProps {
    project: Project;
    scene: Scene;
}

export default function Edit({ project, scene }: SceneEditProps) {
    return (
        <AppShell
            title={`Editar ${scene.title}`}
            actions={
                <Link href={`/projects/${project.id}/scenes`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                    Volver
                </Link>
            }
        >
            <Head title={`Editar ${scene.title}`} />
            <SceneForm projectId={project.id} scene={scene} method="put" submitLabel="Guardar cambios" />
        </AppShell>
    );
}
