import { Link, router } from '@inertiajs/react';
import type { Scene } from '../../types/scene';
import CostEstimationBadge from './CostEstimationBadge';

interface SceneCardProps {
    scene: Scene;
}

export default function SceneCard({ scene }: SceneCardProps) {
    const destroy = () => {
        if (confirm(`Eliminar "${scene.title}"?`)) {
            router.delete(`/projects/${scene.project_id}/scenes/${scene.id}`);
        }
    };

    return (
        <article className="border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="font-semibold text-white">
                        {scene.order}. {scene.title}
                    </h3>
                    <p className="text-sm text-zinc-400">{scene.expected_emotion || 'Emocion no definida'}</p>
                </div>
                <CostEstimationBadge level={scene.estimated_cost} />
            </div>
            <p className="mt-3 text-sm text-zinc-300">{scene.summary || 'Sin resumen.'}</p>
            {scene.conflict && <p className="mt-3 text-sm text-rose-100">{scene.conflict}</p>}
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-400">
                {scene.interest_level && <span>Interes {scene.interest_level}/10</span>}
                {scene.scene_type && <span>{scene.scene_type}</span>}
                {typeof scene.dialogue_nodes_count === 'number' && <span>{scene.dialogue_nodes_count} dialogos</span>}
            </div>
            <div className="mt-4 flex gap-2">
                <Link href={`/projects/${scene.project_id}/scenes/${scene.id}/edit`} className="border border-zinc-700 px-3 py-2 text-sm hover:border-amber-500">
                    Editar
                </Link>
                <button type="button" onClick={destroy} className="border border-rose-800 px-3 py-2 text-sm text-rose-200 hover:bg-rose-950">
                    Eliminar
                </button>
            </div>
        </article>
    );
}
