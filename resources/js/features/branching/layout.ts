import { __ } from '../../shared/lib/i18n';
import type { GraphEdge, GraphNode } from './branching.types';
import type { DialogueType } from '../dialogues/dialogues.types';
import type { ColorToken } from '../../shared/lib/tokens';

export const NODE_WIDTH = 260;
export const NODE_HEIGHT = 150;

const COLUMN_GAP = 120;
const ROW_GAP = 40;

export const DIALOGUE_TYPE_STYLE: Record<DialogueType, { label: string; accent: string; badge: string; minimap: ColorToken }> = {
    cutscene: { label: 'Cutscene', accent: 'border-l-kind-cutscene', badge: 'border-kind-cutscene/50 bg-kind-cutscene/10 text-kind-cutscene', minimap: 'kind-cutscene' },
    ambient: { label: 'Ambient', accent: 'border-l-kind-ambient', badge: 'border-kind-ambient/50 bg-kind-ambient/10 text-kind-ambient', minimap: 'kind-ambient' },
    bark: { label: 'Bark', accent: 'border-l-kind-bark', badge: 'border-kind-bark/50 bg-kind-bark/10 text-kind-bark', minimap: 'kind-bark' },
    interactive_no_branch: { label: 'Interactive, no branches', accent: 'border-l-kind-linear', badge: 'border-kind-linear/50 bg-kind-linear/10 text-kind-linear', minimap: 'kind-linear' },
    interactive_rubber_banding: { label: 'Interactive, rubber-banding', accent: 'border-l-kind-rubber', badge: 'border-kind-rubber/50 bg-kind-rubber/10 text-kind-rubber', minimap: 'kind-rubber' },
    interactive_alternative_paths: { label: 'Interactive, alternative paths', accent: 'border-l-kind-paths', badge: 'border-kind-paths/50 bg-kind-paths/10 text-kind-paths', minimap: 'kind-paths' },
};

/** Etiqueta traducida de un tipo de diálogo (las `label` de arriba son claves de traducción). */
export const dialogueTypeLabel = (type: string) => __(DIALOGUE_TYPE_STYLE[type as DialogueType]?.label ?? type);

/**
 * Posición inicial solo para nodos que aún no tienen pos_x/pos_y: capas por distancia desde el nodo inicial.
 */
export function fallbackPositions(nodes: GraphNode[], edges: GraphEdge[], startId: number | null): Map<number, { x: number; y: number }> {
    const outgoing = new Map<number, number[]>();
    edges.forEach((edge) => outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]));

    const depth = new Map<number, number>();
    const roots = [startId ?? nodes[0]?.id, ...nodes.map((node) => node.id)].filter((id): id is number => id !== undefined);

    for (const root of roots) {
        if (depth.has(root)) {
            continue;
        }

        const base = depth.size === 0 ? 0 : Math.max(...depth.values()) + 1;
        depth.set(root, base);
        const frontier = [root];

        while (frontier.length > 0) {
            const current = frontier.shift() as number;

            for (const next of outgoing.get(current) ?? []) {
                if (!depth.has(next)) {
                    depth.set(next, (depth.get(current) ?? 0) + 1);
                    frontier.push(next);
                }
            }
        }
    }

    const rows = new Map<number, number>();
    const result = new Map<number, { x: number; y: number }>();

    nodes.forEach((node) => {
        const column = depth.get(node.id) ?? 0;
        const row = rows.get(column) ?? 0;
        rows.set(column, row + 1);
        result.set(node.id, { x: column * (NODE_WIDTH + COLUMN_GAP), y: row * (NODE_HEIGHT + ROW_GAP) });
    });

    return result;
}
