import type { GraphEdge, GraphNode } from './branching.types';
import type { DialogueType } from '../dialogues/dialogues.types';

export const NODE_WIDTH = 260;
export const NODE_HEIGHT = 150;

const COLUMN_GAP = 120;
const ROW_GAP = 40;

export const DIALOGUE_TYPE_STYLE: Record<DialogueType, { label: string; accent: string; badge: string; minimap: string }> = {
    cutscene: { label: 'Cutscene', accent: 'border-l-violet-500', badge: 'border-violet-700 bg-violet-950/50 text-violet-200', minimap: '#8b5cf6' },
    ambient: { label: 'Ambient', accent: 'border-l-zinc-500', badge: 'border-zinc-600 bg-zinc-800/60 text-zinc-300', minimap: '#71717a' },
    bark: { label: 'Bark', accent: 'border-l-yellow-500', badge: 'border-yellow-700 bg-yellow-950/40 text-yellow-200', minimap: '#eab308' },
    interactive_no_branch: { label: 'Interactivo sin ramas', accent: 'border-l-sky-500', badge: 'border-sky-700 bg-sky-950/40 text-sky-200', minimap: '#0ea5e9' },
    interactive_rubber_banding: { label: 'Interactivo rubber-banding', accent: 'border-l-amber-500', badge: 'border-amber-700 bg-amber-950/40 text-amber-200', minimap: '#f59e0b' },
    interactive_alternative_paths: { label: 'Interactivo rutas alternas', accent: 'border-l-fuchsia-500', badge: 'border-fuchsia-700 bg-fuchsia-950/40 text-fuchsia-200', minimap: '#d946ef' },
};

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
