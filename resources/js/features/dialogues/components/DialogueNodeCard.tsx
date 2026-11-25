import { __ } from '../../../shared/lib/i18n';
import { Link, router } from '@inertiajs/react';
import { DIALOGUE_TYPE_STYLE, dialogueTypeLabel } from '../../branching/layout';
import type { DialogueNode } from '../dialogues.types';
import { dangerButton, secondary } from '../../../shared/lib/styles';

interface DialogueNodeCardProps {
    dialogue: DialogueNode;
}

export default function DialogueNodeCard({ dialogue }: DialogueNodeCardProps) {
    const destroy = () => {
        if (confirm(__('Delete ":name"?', { name: dialogue.node_key }))) {
            router.delete(`/projects/${dialogue.project_id}/dialogues/${dialogue.id}`);
        }
    };

    return (
        <article className="flex flex-col rounded-lg border border-border bg-surface p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold">{dialogue.title || dialogue.node_key}</h3>
                    <p className="text-sm text-muted">
                        {dialogue.character?.name ?? __('No character')} {dialogue.scene ? `- ${dialogue.scene.title}` : ''}
                    </p>
                </div>
                <span className={`shrink-0 rounded-sm border px-2 py-0.5 text-xs ${DIALOGUE_TYPE_STYLE[dialogue.dialogue_type]?.badge ?? ""}`}>{dialogueTypeLabel(dialogue.dialogue_type)}</span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted">{dialogue.text}</p>
            {dialogue.options && dialogue.options.length > 0 && (
                <div className="mt-3 space-y-2 text-sm text-muted">
                    {dialogue.options.map((option, index) => (
                        <div key={`${dialogue.id}-${index}`} className="border-l border-border-strong pl-3">
                            {option.player_option}
                        </div>
                    ))}
                </div>
            )}
            <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <Link href={`/projects/${dialogue.project_id}/branching?node=${dialogue.id}`} className={secondary}>
                    {__('View on map')}
                </Link>
                <Link href={`/projects/${dialogue.project_id}/dialogues/${dialogue.id}/edit`} className={secondary}>
                    {__('Edit')}
                </Link>
                <button type="button" onClick={destroy} className={dangerButton}>
                    {__('Delete')}
                </button>
            </div>
        </article>
    );
}
