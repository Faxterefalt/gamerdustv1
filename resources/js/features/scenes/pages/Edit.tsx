import { __ } from '../../../shared/lib/i18n';
import { Head, Link } from '@inertiajs/react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import SceneForm from '../components/SceneForm';
import type { Project } from '../../projects/projects.types';
import type { Scene } from '../scenes.types';
import { secondary } from '../../../shared/lib/styles';

interface SceneEditProps {
    project: Project;
    scene: Scene;
}

export default function Edit({ project, scene }: SceneEditProps) {
    return (
        <ProjectLayout
            title={__('Edit :name', { name: scene.title })}
            actions={
                <Link href={`/projects/${project.id}/scenes`} className={secondary}>
                    {__('Back')}
                </Link>
            }
        >
            <Head title={__('Edit :name', { name: scene.title })} />
            <SceneForm projectId={project.id} scene={scene} method="put" submitLabel={__('Save changes')} />
        </ProjectLayout>
    );
}
