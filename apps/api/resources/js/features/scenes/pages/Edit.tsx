import { Head, Link } from '@inertiajs/react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import SceneForm from '../components/SceneForm';
import type { Project } from '../../projects/projects.types';
import type { Scene } from '../scenes.types';

interface SceneEditProps {
    project: Project;
    scene: Scene;
}

export default function Edit({ project, scene }: SceneEditProps) {
    return (
        <ProjectLayout
            title={`Editar ${scene.title}`}
            actions={
                <Link href={`/projects/${project.id}/scenes`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                    Volver
                </Link>
            }
        >
            <Head title={`Editar ${scene.title}`} />
            <SceneForm projectId={project.id} scene={scene} method="put" submitLabel="Guardar cambios" />
        </ProjectLayout>
    );
}
