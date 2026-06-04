import { Head, Link } from '@inertiajs/react';
import AppShell from '../../components/gamerdust/AppShell';
import SceneCard from '../../components/gamerdust/SceneCard';
import type { Paginated, Project } from '../../types/project';
import type { Scene } from '../../types/scene';

interface ScenesIndexProps {
    project: Project;
    scenes: Paginated<Scene>;
}

export default function Index({ project, scenes }: ScenesIndexProps) {
    return (
        <AppShell
            title={`Escenas - ${project.title}`}
            actions={
                <div className="flex gap-2">
                    <Link href={`/projects/${project.id}`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                        Panel
                    </Link>
                    <Link href={`/projects/${project.id}/scenes/create`} className="border border-amber-600 px-4 py-2 text-sm text-amber-100 hover:bg-amber-950">
                        Nueva escena
                    </Link>
                </div>
            }
        >
            <Head title={`Escenas - ${project.title}`} />
            <div className="grid gap-4 lg:grid-cols-2">
                {scenes.data.map((scene) => (
                    <SceneCard key={scene.id} scene={scene} />
                ))}
            </div>
        </AppShell>
    );
}
