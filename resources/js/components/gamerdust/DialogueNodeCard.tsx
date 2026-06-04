import { Link, router } from '@inertiajs/react';
import type { DialogueNode } from '../../types/dialogue';

interface DialogueNodeCardProps {
    dialogue: DialogueNode;
}

export default function DialogueNodeCard({ dialogue }: DialogueNodeCardProps) {
    const destroy = () => {
        if (confirm(`Eliminar "${dialogue.node_key}"?`)) {
            router.delete(`/projects/${dialogue.project_id}/dialogues/${dialogue.id}`);
        }
    };

    return (
        <article className="border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="font-semibold text-white">{dialogue.node_key}</h3>
                    <p className="text-sm text-zinc-400">
                        {dialogue.character?.name ?? 'Sin personaje'} {dialogue.scene ? `- ${dialogue.scene.title}` : ''}
                    </p>
                </div>
                <span className="border border-fuchsia-800 bg-fuchsia-950/40 px-2 py-1 text-xs text-fuchsia-200">{dialogue.dialogue_type}</span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">{dialogue.text}</p>
            {dialogue.options && dialogue.options.length > 0 && (
                <div className="mt-3 space-y-2 text-sm text-zinc-300">
                    {dialogue.options.map((option, index) => (
                        <div key={`${dialogue.id}-${index}`} className="border-l border-zinc-700 pl-3">
                            {option.player_option}
                        </div>
                    ))}
                </div>
            )}
            <div className="mt-4 flex gap-2">
                <Link href={`/projects/${dialogue.project_id}/dialogues/${dialogue.id}/edit`} className="border border-zinc-700 px-3 py-2 text-sm hover:border-amber-500">
                    Editar
                </Link>
                <button type="button" onClick={destroy} className="border border-rose-800 px-3 py-2 text-sm text-rose-200 hover:bg-rose-950">
                    Eliminar
                </button>
            </div>
        </article>
    );
}
