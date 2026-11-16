import { __ } from '../../../shared/lib/i18n';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Flag, MapPin, User } from 'lucide-react';
import { memo } from 'react';
import type { GraphNode, WarningCode } from '../branching.types';
import { DIALOGUE_TYPE_STYLE, NODE_WIDTH } from '../layout';

export type DialogueFlowNodeData = { node: GraphNode; flags: WarningCode[]; brokenCount: number };
export type DialogueFlowNodeType = Node<DialogueFlowNodeData, 'dialogue'>;

const FLAG_LABEL: Partial<Record<WarningCode, string>> = {
    isolated: 'Isolated',
    no_incoming: 'No incoming',
    no_outgoing: 'No outgoing',
};

function DialogueFlowNode({ data, selected }: NodeProps<DialogueFlowNodeType>) {
    const { node, flags, brokenCount } = data;
    const style = DIALOGUE_TYPE_STYLE[node.dialogue_type];

    return (
        <div
            style={{ width: NODE_WIDTH }}
            className={`border border-l-4 bg-zinc-900 p-3 text-left shadow-lg ${style.accent} ${
                selected ? 'border-amber-500 ring-2 ring-amber-500/40' : 'border-zinc-800 hover:border-zinc-600'
            }`}
        >
            <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-zinc-950 !bg-zinc-400" />

            <div className="flex items-start gap-2">
                {node.is_start && <Flag size={14} className="mt-0.5 shrink-0 text-amber-400" aria-label={__('Start node')} />}
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white">{node.display_title}</h3>
            </div>

            <p className="mt-1 line-clamp-3 min-h-[3.75rem] whitespace-pre-wrap text-xs leading-5 text-zinc-400">
                {node.text || <span className="italic text-zinc-600">{__('No text')}</span>}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px]">
                <span className={`border px-1.5 py-0.5 ${style.badge}`}>{__(style.label)}</span>
                {node.scene_title && (
                    <span className="flex items-center gap-1 border border-zinc-700 px-1.5 py-0.5 text-zinc-300">
                        <MapPin size={10} /> {node.scene_title}
                    </span>
                )}
                {node.character_name && (
                    <span className="flex items-center gap-1 border border-zinc-700 px-1.5 py-0.5 text-zinc-300">
                        <User size={10} /> {node.character_name}
                    </span>
                )}
            </div>

            {(flags.length > 0 || brokenCount > 0) && (
                <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                    {brokenCount > 0 && <span className="border border-rose-800 bg-rose-950/50 px-1.5 py-0.5 text-rose-200">{__(':count without target', { count: brokenCount })}</span>}
                    {flags.map((flag) =>
                        FLAG_LABEL[flag] ? (
                            <span key={flag} className={`border px-1.5 py-0.5 ${flag === 'isolated' ? 'border-amber-800 bg-amber-950/40 text-amber-200' : 'border-zinc-700 text-zinc-400'}`}>
                                {__(FLAG_LABEL[flag] as string)}
                            </span>
                        ) : null,
                    )}
                </div>
            )}

            <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-zinc-950 !bg-amber-500" />
        </div>
    );
}

export default memo(DialogueFlowNode);
