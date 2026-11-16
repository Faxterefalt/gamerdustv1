import { __ } from '../../../shared/lib/i18n';
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
            title={__('Edit :name', { name: scene.title })}
            actions={
                <Link href={`/projects/${project.id}/scenes`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                    {__('Back')}
                </Link>
            }
        >
            <Head title={__('Edit :name', { name: scene.title })} />
            <SceneForm projectId={project.id} scene={scene} method="put" submitLabel={__('Save changes')} />
        </ProjectLayout>
    );
}
