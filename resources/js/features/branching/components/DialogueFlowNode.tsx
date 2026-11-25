import { __ } from '../../../shared/lib/i18n';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Flag, FlagTriangleRight, MapPin, User } from 'lucide-react';
import { memo } from 'react';
import type { GraphNode, WarningCode } from '../branching.types';
import { DIALOGUE_TYPE_STYLE, NODE_WIDTH } from '../layout';

export type DialogueFlowNodeData = { node: GraphNode; flags: WarningCode[]; brokenCount: number };
export type DialogueFlowNodeType = Node<DialogueFlowNodeData, 'dialogue'>;

const FLAG_LABEL: Partial<Record<WarningCode, string>> = {
    isolated: 'Isolated',
    no_incoming: 'No incoming',
    unreachable: 'Unreachable',
    no_outgoing: 'No outgoing',
};

function DialogueFlowNode({ data, selected }: NodeProps<DialogueFlowNodeType>) {
    const { node, flags, brokenCount } = data;
    const style = DIALOGUE_TYPE_STYLE[node.dialogue_type];

    return (
        <div
            style={{ width: NODE_WIDTH }}
            className={`border border-l-4 bg-surface p-3 text-left ${style.accent} ${
                selected ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-border-strong'
            }`}
        >
            <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-border !bg-surface-3" />

            <div className="flex items-start gap-2">
                {node.is_start && <Flag size={14} className="mt-0.5 shrink-0 text-primary" aria-label={__('Start node')} />}
                {node.is_ending && <FlagTriangleRight size={14} className="mt-0.5 shrink-0 text-success" aria-label={__('Ending')} />}
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{node.display_title}</h3>
            </div>

            <p className="mt-1 line-clamp-3 min-h-[3.75rem] whitespace-pre-wrap text-xs leading-5 text-muted">
                {node.text || <span className="italic text-subtle">{__('No text')}</span>}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
                <span className={`border px-1.5 py-0.5 ${style.badge}`}>{__(style.label)}</span>
                {node.scene_title && (
                    <span className="flex items-center gap-1 border border-border-strong px-1.5 py-0.5 text-muted">
                        <MapPin size={10} /> {node.scene_title}
                    </span>
                )}
                {node.character_name && (
                    <span className="flex items-center gap-1 border border-border-strong px-1.5 py-0.5 text-muted">
                        <User size={10} /> {node.character_name}
                    </span>
                )}
            </div>

            {(flags.length > 0 || brokenCount > 0) && (
                <div className="mt-2 flex flex-wrap gap-1 text-xs">
                    {brokenCount > 0 && <span className="border border-danger/50 bg-danger/10 px-1.5 py-0.5 text-danger">{__(':count without target', { count: brokenCount })}</span>}
                    {flags.map((flag) =>
                        FLAG_LABEL[flag] ? (
                            <span key={flag} className={`border px-1.5 py-0.5 ${flag === 'isolated' || flag === 'unreachable' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border-strong text-muted'}`}>
                                {__(FLAG_LABEL[flag] as string)}
                            </span>
                        ) : null,
                    )}
                </div>
            )}

            <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-border !bg-primary" />
        </div>
    );
}

export default memo(DialogueFlowNode);
