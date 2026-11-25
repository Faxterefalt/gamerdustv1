import { BaseEdge, EdgeLabelRenderer, getBezierPath, type Edge, type EdgeProps } from '@xyflow/react';
import { memo } from 'react';
import { cssVar } from '../../../shared/lib/tokens';

export type OptionEdgeData = { label: string; managed: boolean; index: number; count: number };
export type OptionEdgeType = Edge<OptionEdgeData, 'option'>;

function OptionEdge({ id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data, selected }: EdgeProps<OptionEdgeType>) {
    const index = data?.index ?? 0;
    const count = data?.count ?? 1;
    const spread = (index - (count - 1) / 2) * 22;

    let path: string;
    let labelX: number;
    let labelY: number;

    if (source === target) {
        // Autoreferencia: el arco rodea la parte superior del nodo.
        const lift = 70 + index * 24;
        path = `M ${sourceX} ${sourceY} C ${sourceX + 80} ${sourceY - lift}, ${targetX - 80} ${targetY - lift}, ${targetX} ${targetY}`;
        labelX = (sourceX + targetX) / 2;
        labelY = sourceY - lift * 0.75 - 8;
    } else {
        [path, labelX, labelY] = getBezierPath({
            sourceX,
            sourceY,
            sourcePosition,
            targetX,
            targetY,
            targetPosition,
            curvature: 0.25 + Math.abs(index - (count - 1) / 2) * 0.2,
        });
        labelY += spread;
    }

    // Seleccionada: acento; administrada por {{Referencia}}: brasa; manual: gris (discontinua).
    const color = selected ? cssVar('primary') : data?.managed ? cssVar('ember') : cssVar('subtle');
    const label = data?.label ?? '';

    return (
        <>
            <BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ stroke: color, strokeWidth: selected ? 2.5 : 1.75, strokeDasharray: data?.managed ? undefined : '6 4' }} />
            {label && (
                <EdgeLabelRenderer>
                    <div
                        style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
                        title={label}
                        className="nodrag nopan pointer-events-auto absolute max-w-[150px] truncate border border-border-strong bg-background/95 px-1.5 py-0.5 text-xs text-foreground"
                    >
                        {label}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}

export default memo(OptionEdge);
