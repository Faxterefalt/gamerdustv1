import { router } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '../api';
import type {
    BranchingGraph,
    GraphNode,
    GraphOption,
    NodePatch,
    OptionPatch,
    SaveResponse,
    SaveStatus,
} from '../branching.types';
import { useDebouncedSave } from './useDebouncedSave';

export interface Notice {
    id: number;
    tone: 'info' | 'warning' | 'error';
    message: string;
}

export interface SaveError {
    nodeId?: number;
    optionId?: number;
    message: string;
    fields: Record<string, string[]>;
}

type Position = { id: number; x: number; y: number };

const TEXT_DELAY = 800;
const POSITION_DELAY = 500;

let noticeSeq = 0;

function withoutSaved<T extends object>(current: Record<number, T>, id: number, sent: T): Record<number, T> {
    const draft = current[id];

    if (!draft) {
        return current;
    }

    const rest = Object.fromEntries(Object.entries(draft).filter(([key, value]) => (sent as Record<string, unknown>)[key] !== value)) as T;
    const next = { ...current };

    if (Object.keys(rest).length === 0) {
        delete next[id];
    } else {
        next[id] = rest;
    }

    return next;
}

/**
 * Estado del editor. El servidor es la fuente de verdad: cada guardado devuelve el grafo ya sincronizado.
 * Los borradores (texto, título, opciones) se guardan con debounce, en serie y se vacían al confirmarse.
 */
export function useBranchingGraph(projectId: number, initial: BranchingGraph) {
    const base = `/projects/${projectId}/branching`;

    const [graph, setGraph] = useState(initial);
    const [nodeDrafts, setNodeDrafts] = useState<Record<number, NodePatch>>({});
    const [optionDrafts, setOptionDrafts] = useState<Record<number, OptionPatch>>({});
    const [notices, setNotices] = useState<Notice[]>([]);
    const [error, setError] = useState<SaveError | null>(null);
    const [inflight, setInflight] = useState(0);
    const [savedOnce, setSavedOnce] = useState(false);

    const nodeDraftsRef = useRef(nodeDrafts);
    const optionDraftsRef = useRef(optionDrafts);
    const positionsRef = useRef<Map<number, Position>>(new Map());
    const queue = useRef<Promise<unknown>>(Promise.resolve());

    const notify = useCallback((tone: Notice['tone'], message: string) => {
        setNotices((current) => [...current.slice(-4), { id: ++noticeSeq, tone, message }]);
    }, []);

    const dismissNotice = useCallback((id: number) => setNotices((current) => current.filter((notice) => notice.id !== id)), []);

    const updateNodeDrafts = (next: Record<number, NodePatch>) => {
        nodeDraftsRef.current = next;
        setNodeDrafts(next);
    };

    const updateOptionDrafts = (next: Record<number, OptionPatch>) => {
        optionDraftsRef.current = next;
        setOptionDrafts(next);
    };

    const enqueue = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
        setInflight((count) => count + 1);

        const run = queue.current.then(task, task).finally(() => setInflight((count) => count - 1));
        queue.current = run.catch(() => undefined);

        return run;
    }, []);

    const handleError = useCallback(
        (caught: unknown, target: Pick<SaveError, 'nodeId' | 'optionId'> = {}) => {
            const apiError = caught instanceof ApiError ? caught : new ApiError('No se pudo guardar. Revisa tu conexion.', 0);
            const first = Object.values(apiError.errors)[0]?.[0];

            setError({ ...target, message: first ?? apiError.message, fields: apiError.errors });
        },
        [],
    );

    const applyResponse = useCallback(
        (response: SaveResponse) => {
            setGraph(response.graph);
            setError(null);
            setSavedOnce(true);

            if (response.sync?.created_nodes.length) {
                notify('info', `Se crearon nodos por referencia: ${response.sync.created_nodes.map((node) => node.title).join(', ')}.`);
            }

            if (response.sync?.removed_options.length) {
                notify('info', `Se quitaron opciones administradas: ${response.sync.removed_options.map((option) => option.player_option).join(', ')}.`);
            }

            if (response.renamed?.length) {
                notify('warning', `Referencias actualizadas en: ${response.renamed.map((node) => node.title).join(', ')}.`);
            }

            if (response.broken_options?.length) {
                notify(
                    'warning',
                    `Opciones que quedaron sin destino: ${response.broken_options.map((option) => `"${option.player_option}" en ${option.source_title}`).join('; ')}. ` +
                        'Si su texto aun contiene {{referencia}}, el nodo se recreara al guardar ese texto.',
                );
            }
        },
        [notify],
    );

    const saveDrafts = useCallback(async () => {
        const nodes = Object.entries(nodeDraftsRef.current).map(([id, patch]) => [Number(id), patch] as const);
        const options = Object.entries(optionDraftsRef.current).map(([id, patch]) => [Number(id), patch] as const);

        const jobs = [
            ...nodes.map(([id, patch]) =>
                enqueue(async () => {
                    try {
                        applyResponse(await api<SaveResponse>('PUT', `${base}/nodes/${id}`, patch));
                        updateNodeDrafts(withoutSaved(nodeDraftsRef.current, id, patch));
                    } catch (caught) {
                        handleError(caught, { nodeId: id });
                    }
                }),
            ),
            ...options.map(([id, patch]) =>
                enqueue(async () => {
                    try {
                        applyResponse(await api<SaveResponse>('PUT', `${base}/options/${id}`, patch));
                        updateOptionDrafts(withoutSaved(optionDraftsRef.current, id, patch));
                    } catch (caught) {
                        handleError(caught, { optionId: id });
                    }
                }),
            ),
        ];

        await Promise.all(jobs);
    }, [applyResponse, base, enqueue, handleError]);

    const savePositions = useCallback(async () => {
        const batch = [...positionsRef.current.values()];
        positionsRef.current = new Map();

        if (batch.length === 0) {
            return;
        }

        await enqueue(async () => {
            try {
                await api('PUT', `${base}/positions`, { positions: batch });
            } catch (caught) {
                batch.forEach((position) => positionsRef.current.set(position.id, position));
                handleError(caught);
            }
        });
    }, [base, enqueue, handleError]);

    const drafts = useDebouncedSave(saveDrafts, TEXT_DELAY);
    const positions = useDebouncedSave(savePositions, POSITION_DELAY);

    const flush = useCallback(async () => {
        await positions.flush();
        await drafts.flush();
        await queue.current;
    }, [drafts, positions]);

    const editNode = useCallback(
        (id: number, patch: NodePatch) => {
            updateNodeDrafts({ ...nodeDraftsRef.current, [id]: { ...nodeDraftsRef.current[id], ...patch } });
            drafts.schedule();
        },
        [drafts],
    );

    const editOption = useCallback(
        (id: number, patch: OptionPatch, immediate = false) => {
            updateOptionDrafts({ ...optionDraftsRef.current, [id]: { ...optionDraftsRef.current[id], ...patch } });

            if (immediate) {
                void drafts.flush();
            } else {
                drafts.schedule();
            }
        },
        [drafts],
    );

    const movePositions = useCallback(
        (items: Position[]) => {
            items.forEach((item) => positionsRef.current.set(item.id, item));
            positions.schedule();
        },
        [positions],
    );

    const run = useCallback(
        async (task: () => Promise<SaveResponse>, target: Pick<SaveError, 'nodeId' | 'optionId'> = {}) => {
            try {
                const response = await enqueue(task);
                applyResponse(response);

                return response;
            } catch (caught) {
                handleError(caught, target);

                return null;
            }
        },
        [applyResponse, enqueue, handleError],
    );

    const createNode = useCallback(
        async (data: { title: string; scene_id?: number | null; pos_x: number; pos_y: number }) => {
            await flush();

            return run(() => api<SaveResponse>('POST', `${base}/nodes`, data));
        },
        [base, flush, run],
    );

    const deleteNode = useCallback(
        async (id: number) => {
            const { [id]: discardedNode, ...otherNodes } = nodeDraftsRef.current;
            void discardedNode;
            updateNodeDrafts(otherNodes);

            await flush();

            return run(() => api<SaveResponse>('DELETE', `${base}/nodes/${id}`), { nodeId: id });
        },
        [base, flush, run],
    );

    const createOption = useCallback(
        async (nodeId: number, data: OptionPatch & { player_option: string }) => {
            await flush();

            return run(() => api<SaveResponse>('POST', `${base}/nodes/${nodeId}/options`, data), { nodeId });
        },
        [base, flush, run],
    );

    const deleteOption = useCallback(
        async (optionId: number) => {
            const { [optionId]: discarded, ...others } = optionDraftsRef.current;
            void discarded;
            updateOptionDrafts(others);

            return run(() => api<SaveResponse>('DELETE', `${base}/options/${optionId}`), { optionId });
        },
        [base, run],
    );

    useEffect(() => {
        const sendKeepalive = () => {
            Object.entries(nodeDraftsRef.current).forEach(([id, patch]) => void api('PUT', `${base}/nodes/${id}`, patch, { keepalive: true }).catch(() => undefined));
            Object.entries(optionDraftsRef.current).forEach(([id, patch]) => void api('PUT', `${base}/options/${id}`, patch, { keepalive: true }).catch(() => undefined));

            if (positionsRef.current.size > 0) {
                void api('PUT', `${base}/positions`, { positions: [...positionsRef.current.values()] }, { keepalive: true }).catch(() => undefined);
            }
        };

        const beforeUnload = (event: BeforeUnloadEvent) => {
            const dirty =
                Object.keys(nodeDraftsRef.current).length > 0 || Object.keys(optionDraftsRef.current).length > 0 || positionsRef.current.size > 0;

            if (dirty) {
                sendKeepalive();
                event.preventDefault();
                event.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', beforeUnload);
        const removeInertia = router.on('before', () => {
            void flush();
        });

        return () => {
            window.removeEventListener('beforeunload', beforeUnload);
            removeInertia();
        };
    }, [base, flush]);

    const hasDrafts = Object.keys(nodeDrafts).length > 0 || Object.keys(optionDrafts).length > 0;

    const status: SaveStatus = useMemo(() => {
        if (error) {
            return 'error';
        }

        if (inflight > 0) {
            return 'saving';
        }

        if (hasDrafts) {
            return 'pending';
        }

        return savedOnce ? 'saved' : 'idle';
    }, [error, hasDrafts, inflight, savedOnce]);

    const displayNode = useCallback(
        (node: GraphNode): GraphNode => {
            const draft = nodeDrafts[node.id];

            if (!draft) {
                return node;
            }

            return { ...node, ...draft, display_title: draft.title !== undefined ? draft.title || node.node_key : node.display_title };
        },
        [nodeDrafts],
    );

    const displayOption = useCallback((option: GraphOption): GraphOption => ({ ...option, ...optionDrafts[option.id] }), [optionDrafts]);

    return {
        graph,
        status,
        notices,
        error,
        dismissNotice,
        clearError: () => setError(null),
        displayNode,
        displayOption,
        editNode,
        editOption,
        movePositions,
        createNode,
        deleteNode,
        createOption,
        deleteOption,
        flush,
    };
}
