import { __, choice } from '../../../shared/lib/i18n';
import { Link, router } from '@inertiajs/react';
import type { Scene } from '../scenes.types';
import CostEstimationBadge from '../../analysis/components/CostEstimationBadge';
import { dangerButton, secondary } from '../../../shared/lib/styles';

interface SceneCardProps {
    scene: Scene;
}

export default function SceneCard({ scene }: SceneCardProps) {
    const destroy = () => {
        if (confirm(__('Delete ":name"?', { name: scene.title }))) {
            router.delete(`/projects/${scene.project_id}/scenes/${scene.id}`);
        }
    };

    return (
        <article className="border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="font-semibold text-foreground">
                        {scene.order}. {scene.title}
                    </h3>
                    <p className="text-sm text-muted">{scene.expected_emotion || __('Emotion not defined')}</p>
                </div>
                <CostEstimationBadge level={scene.estimated_cost} />
            </div>
            <p className="mt-3 text-sm text-muted">{scene.summary || __('No summary.')}</p>
            {scene.conflict && <p className="mt-3 text-sm text-danger">{scene.conflict}</p>}
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
                {scene.interest_level && <span>{__('Interest :level/10', { level: scene.interest_level })}</span>}
                {scene.scene_type && <span>{scene.scene_type}</span>}
                {typeof scene.dialogue_nodes_count === 'number' && <span>{choice(':count dialogue|:count dialogues', scene.dialogue_nodes_count)}</span>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/projects/${scene.project_id}/script?scene=${scene.id}`} className={secondary}>
                    {__('Write script')}
                </Link>
                <Link href={`/projects/${scene.project_id}/scenes/${scene.id}/edit`} className={secondary}>
                    {__('Edit')}
                </Link>
                <button type="button" onClick={destroy} className={dangerButton}>
                    {__('Delete')}
                </button>
            </div>
        </article>
    );
}
