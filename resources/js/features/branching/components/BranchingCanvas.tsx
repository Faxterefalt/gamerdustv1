import { __, choice } from '../../../shared/lib/i18n';
import {
    Background,
    BackgroundVariant,
    Controls,
    MarkerType,
    MiniMap,
    Panel,
    ReactFlow,
    ReactFlowProvider,
    useNodesState,
    useReactFlow,
    type Connection,
    type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Crosshair, Maximize, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { BranchingGraph, GraphNode, GraphWarning } from '../branching.types';
import { DIALOGUE_TYPE_STYLE, fallbackPositions, NODE_HEIGHT, NODE_WIDTH } from '../layout';
import DialogueFlowNode, { type DialogueFlowNodeType } from './DialogueFlowNode';
import OptionEdge, { type OptionEdgeType } from './OptionEdge';

const nodeTypes = { dialogue: DialogueFlowNode };
const edgeTypes = { option: OptionEdge };

export interface CanvasPosition {
    id: number;
    x: number;
    y: number;
}

interface BranchingCanvasProps {
    graph: BranchingGraph;
    displayNode: (node: GraphNode) => GraphNode;
    selectedId: number | null;
    focusNonce: number;
    onSelect: (id: number | null) => void;
    onMove: (positions: CanvasPosition[]) => void;
    onConnect: (sourceId: number, targetId: number) => void;
    onCreate: (position: { x: number; y: number }) => void;
}

function warningsByNode(warnings: GraphWarning[]) {
    const map = new Map<number, GraphWarning[]>();
    warnings.forEach((warning) => map.set(warning.node_id, [...(map.get(warning.node_id) ?? []), warning]));

    return map;
}

function Canvas({ graph, displayNode, selectedId, focusNonce, onSelect, onMove, onConnect, onCreate }: BranchingCanvasProps) {
    const { fitView, setCenter, getZoom, screenToFlowPosition } = useReactFlow();
    const wrapper = useRef<HTMLDivElement>(null);
    const positions = useRef(new Map<number, { x: number; y: number }>());
    const persisted = useRef(new Set<number>());

    const build = useCallback((): DialogueFlowNodeType[] => {
        const hasUnplaced = graph.nodes.some((node) => node.pos_x === null || node.pos_y === null);
        const fallback = hasUnplaced ? fallbackPositions(graph.nodes, graph.edges, graph.start_node_id) : new Map();
        const warnings = warningsByNode(graph.warnings);

        return graph.nodes.map((raw) => {
            const node = displayNode(raw);
            const own = warnings.get(node.id) ?? [];
            const position =
                positions.current.get(node.id) ??
                (raw.pos_x !== null && raw.pos_y !== null ? { x: raw.pos_x, y: raw.pos_y } : (fallback.get(node.id) ?? { x: 0, y: 0 }));

            positions.current.set(node.id, position);

            return {
                id: String(node.id),
                type: 'dialogue',
                position,
                selected: node.id === selectedId,
                data: {
                    node,
                    flags: own.map((warning) => warning.code),
                    brokenCount: own.filter((warning) => warning.code === 'broken_option').length,
                },
            };
        });
    }, [displayNode, graph, selectedId]);

    const [nodes, setNodes, onNodesChange] = useNodesState<DialogueFlowNodeType>(useMemo(build, []));

    useEffect(() => {
        setNodes(build());

        const unplaced = graph.nodes
            .filter((node) => (node.pos_x === null || node.pos_y === null) && !persisted.current.has(node.id))
            .map((node) => ({ id: node.id, ...(positions.current.get(node.id) as { x: number; y: number }) }));

        if (unplaced.length > 0) {
            unplaced.forEach((item) => persisted.current.add(item.id));
            onMove(unplaced);
        }
    }, [build, graph.nodes, onMove, setNodes]);

    const handleNodesChange = useCallback(
        (changes: NodeChange<DialogueFlowNodeType>[]) => {
            changes.forEach((change) => {
                if (change.type === 'position' && change.position) {
                    positions.current.set(Number(change.id), change.position);
                }
            });
            onNodesChange(changes);
        },
        [onNodesChange],
    );

    const edges = useMemo<OptionEdgeType[]>(() => {
        const seen = new Map<string, number>();
        const totals = new Map<string, number>();
        graph.edges.forEach((edge) => totals.set(`${edge.source}-${edge.target}`, (totals.get(`${edge.source}-${edge.target}`) ?? 0) + 1));

        return graph.edges.map((edge) => {
            const key = `${edge.source}-${edge.target}`;
            const index = seen.get(key) ?? 0;
            seen.set(key, index + 1);

            return {
                id: edge.id,
                source: String(edge.source),
                target: String(edge.target),
                type: 'option',
                markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: edge.managed ? '#d946ef' : '#a1a1aa' },
                data: { label: edge.label, managed: edge.managed, index, count: totals.get(key) ?? 1 },
            };
        });
    }, [graph.edges]);

    const center = useCallback(
        (id: number | null) => {
            const position = id === null ? undefined : positions.current.get(id);

            if (position) {
                void setCenter(position.x + NODE_WIDTH / 2, position.y + NODE_HEIGHT / 2, { zoom: Math.max(getZoom(), 1), duration: 300 });
            }
        },
        [getZoom, setCenter],
    );

    useEffect(() => {
        if (focusNonce > 0) {
            center(selectedId);
        }
        // Solo reacciona a la petición explícita de enfoque.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusNonce]);

    const handleConnect = useCallback(
        (connection: Connection) => {
            if (connection.source && connection.target) {
                onConnect(Number(connection.source), Number(connection.target));
            }
        },
        [onConnect],
    );

    const createAtCenter = () => {
        const rect = wrapper.current?.getBoundingClientRect();
        const point = screenToFlowPosition({ x: (rect?.left ?? 0) + (rect?.width ?? 600) / 2, y: (rect?.top ?? 0) + (rect?.height ?? 400) / 2 });

        onCreate({ x: point.x - NODE_WIDTH / 2, y: point.y - NODE_HEIGHT / 2 });
    };

    const counts = useMemo(() => {
        const count = (code: string) => graph.warnings.filter((warning) => warning.code === code).length;

        return { isolated: count('isolated'), incoming: count('no_incoming'), unreachable: count('unreachable'), outgoing: count('no_outgoing'), broken: count('broken_option') };
    }, [graph.warnings]);

    const buttonClass = 'flex items-center gap-1.5 border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:border-amber-500 disabled:opacity-40';

    return (
        <div ref={wrapper} className="h-full w-full">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={handleNodesChange}
                onNodeClick={(_, node) => onSelect(Number(node.id))}
                onPaneClick={() => onSelect(null)}
                onNodeDragStop={(_, __, dragged) => onMove(dragged.map((node) => ({ id: Number(node.id), x: node.position.x, y: node.position.y })))}
                onConnect={handleConnect}
                deleteKeyCode={null}
                fitView
                fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
                minZoom={0.1}
                maxZoom={2}
                onlyRenderVisibleElements
                colorMode="dark"
                className="!bg-zinc-950"
            >
                <Background variant={BackgroundVariant.Lines} gap={32} color="#27272a" />
                <Controls showInteractive={false} />
                <MiniMap pannable zoomable className="!border !border-zinc-800 !bg-zinc-900" maskColor="rgba(9,9,11,0.7)" nodeColor={(node) => DIALOGUE_TYPE_STYLE[(node.data as { node: GraphNode }).node.dialogue_type].minimap} />

                <Panel position="top-left" className="flex flex-wrap gap-2">
                    <button type="button" className={buttonClass} onClick={() => void fitView({ padding: 0.25, duration: 300 })}>
                        <Maximize size={14} /> {__('Fit view')}
                    </button>
                    <button type="button" className={buttonClass} disabled={selectedId === null} onClick={() => center(selectedId)}>
                        <Crosshair size={14} /> {__('Center on selected')}
                    </button>
                    <button type="button" className={`${buttonClass} !border-amber-600 !text-amber-100`} onClick={createAtCenter}>
                        <Plus size={14} /> {__('New node')}
                    </button>
                </Panel>

                <Panel position="bottom-center" className="flex flex-wrap gap-3 border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-[11px] text-zinc-400">
                    <span>{choice(':count node|:count nodes', graph.nodes.length)}</span>
                    <span>{choice(':count connection|:count connections', graph.edges.length)}</span>
                    <span className={counts.isolated ? 'text-amber-300' : ''}>{__(':count isolated', { count: counts.isolated })}</span>
                    <span>{__(':count without incoming', { count: counts.incoming })}</span>
                    <span className={counts.unreachable ? 'text-amber-300' : ''}>{__(':count unreachable', { count: counts.unreachable })}</span>
                    <span>{__(':count without outgoing', { count: counts.outgoing })}</span>
                    <span className={counts.broken ? 'text-rose-300' : ''}>{__(':count options without target', { count: counts.broken })}</span>
                </Panel>
            </ReactFlow>
        </div>
    );
}

export default function BranchingCanvas(props: BranchingCanvasProps) {
    return (
        <ReactFlowProvider>
            <Canvas {...props} />
        </ReactFlowProvider>
    );
}
