import { __ } from '../../../shared/lib/i18n';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, CircleAlert, Loader2, Play, Save, ScanSearch, Variable, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import type { EmotionCatalog } from '../../analysis/emotion.types';
import type { BranchingGraph, SaveStatus } from '../branching.types';
import BranchingCanvas from '../components/BranchingCanvas';
import ConsequenceReviewDialog from '../components/ConsequenceReviewDialog';
import NodeEditorPanel from '../components/NodeEditorPanel';
import PlaytestDialog from '../components/PlaytestDialog';
import VariablesDialog from '../components/VariablesDialog';
import { useBranchingGraph } from '../hooks/useBranchingGraph';
import { iconButton, primarySm, secondary } from '../../../shared/lib/styles';

interface BranchingIndexProps {
    project: { id: number; title: string };
    graph: BranchingGraph;
    selectedNodeId: number | null;
    emotionCatalog: EmotionCatalog;
}

const STATUS_LABEL: Record<SaveStatus, string> = {
    idle: 'No changes',
    pending: 'Unsaved changes...',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'Error saving',
};

const NOTICE_TONE = {
    info: 'border-border-strong bg-surface text-foreground',
    warning: 'border-warning/50 bg-warning/10 text-foreground',
    error: 'border-danger/50 bg-danger/10 text-danger',
} as const;

export default function Index({ project, graph: initialGraph, selectedNodeId, emotionCatalog }: BranchingIndexProps) {
    const editor = useBranchingGraph(project.id, initialGraph);
    const { graph, displayNode, createNode, deleteNode, createOption, deleteOption, movePositions, flush } = editor;
    const [selectedId, setSelectedId] = useState<number | null>(selectedNodeId);
    const [focusNonce, setFocusNonce] = useState(selectedNodeId ? 1 : 0);
    const [showVariables, setShowVariables] = useState(false);
    const [reviewing, setReviewing] = useState(false);
    // undefined = cerrado; null = desde el inicio; número = desde ese nodo.
    const [playFrom, setPlayFrom] = useState<number | null | undefined>(undefined);

    // El reproductor lee el grafo guardado: primero se guardan los borradores pendientes.
    const playtest = async (nodeId: number | null) => {
        await flush();
        setPlayFrom(nodeId);
    };

    useEffect(() => {
        if (selectedId !== null && !graph.nodes.some((node) => node.id === selectedId)) {
            setSelectedId(null);
        }
    }, [graph.nodes, selectedId]);

    const selected = graph.nodes.find((node) => node.id === selectedId) ?? null;

    const handleCreate = useCallback(
        async (position: { x: number; y: number }) => {
            const taken = new Set(graph.nodes.map((node) => node.display_title.trim().toLowerCase()));
            const baseTitle = __('New passage');
            let title = baseTitle;

            for (let n = 2; taken.has(title.toLowerCase()); n++) {
                title = `${baseTitle} ${n}`;
            }

            const response = await createNode({ title, pos_x: position.x, pos_y: position.y });

            if (response?.node_id) {
                setSelectedId(response.node_id);
                setFocusNonce((nonce) => nonce + 1);
            }
        },
        [createNode, graph.nodes],
    );

    const handleConnect = useCallback(
        (sourceId: number, targetId: number) => {
            const target = graph.nodes.find((node) => node.id === targetId);

            void createOption(sourceId, { player_option: target?.display_title ?? __('Continue'), next_dialogue_node_id: targetId });
        },
        [createOption, graph.nodes],
    );

    const handleDelete = async () => {
        if (!selected) {
            return;
        }

        const incoming = graph.edges.filter((edge) => edge.target === selected.id && edge.source !== selected.id);
        const lines = [__('Delete ":name"?', { name: selected.display_title }), ''];

        lines.push(__('- Its :count outgoing options will be deleted.', { count: selected.options.length }));
        lines.push(
            incoming.length > 0
                ? `${__('- :count options from other nodes point here and will be left WITHOUT A TARGET (their text is not deleted):', { count: incoming.length })}\n${incoming.map((edge) => `   • ${graph.nodes.find((node) => node.id === edge.source)?.display_title}: "${edge.label}"`).join('\n')}`
                : __('- No other node points here.'),
        );

        if (confirm(lines.join('\n'))) {
            await deleteNode(selected.id);
            setSelectedId(null);
        }
    };

    const status = editor.status;

    return (
        <ProjectLayout
            fullWidth
            title={__('Branching editor')}
            actions={
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        role="status"
                        className={`mr-2 flex items-center gap-1.5 text-sm ${status === 'error' ? 'text-danger' : status === 'saved' ? 'text-success' : 'text-muted'}`}
                    >
                        {status === 'saving' && <Loader2 size={13} className="animate-spin motion-reduce:animate-none" />}
                        {status === 'saved' && <CheckCircle2 size={13} />}
                        {status === 'error' && <CircleAlert size={13} />}
                        {__(STATUS_LABEL[status])}
                    </span>
                    <button type="button" onClick={() => void flush()} className={primarySm}>
                        <Save size={14} /> {__('Save')}
                    </button>
                    <button
                        type="button"
                        onClick={() => void playtest(null)}
                        disabled={!graph.nodes.length}
                        className={secondary}
                    >
                        <Play size={14} /> {__('Test run')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setReviewing(true)}
                        disabled={!graph.edges.length}
                        title={__('The AI looks for decisions that may not fit together. It only suggests.')}
                        className={secondary}
                    >
                        <ScanSearch size={14} /> {__('Review consequences')}
                    </button>
                    <button type="button" onClick={() => setShowVariables(true)} className={secondary}>
                        <Variable size={14} /> {__('Variables')} ({graph.variables.length})
                    </button>
                    <Link href={`/projects/${project.id}`} className={secondary}>
                        {__('Dashboard')}
                    </Link>
                    <Link href={`/projects/${project.id}/dialogues`} className={secondary}>
                        {__('Dialogue list')}
                    </Link>
                </div>
            }
        >
            <Head title={__('Branching editor')} />

            {editor.notices.length > 0 && (
                <div className="mb-3 space-y-2">
                    {editor.notices.map((notice) => (
                        <div key={notice.id} role="status" className={`flex items-center justify-between gap-3 rounded-md border py-1 pl-3 pr-1 text-sm ${NOTICE_TONE[notice.tone]}`}>
                            <span>{notice.message}</span>
                            <button type="button" aria-label={__('Close notice')} onClick={() => editor.dismissNotice(notice.id)} className={iconButton}>
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {editor.error && !selected && <div role="alert" className="mb-3 rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">{editor.error.message}</div>}

            <div className="flex h-[calc(100dvh-var(--header-h)-var(--crumb-h)-8rem)] min-h-[520px] overflow-hidden rounded-lg border border-border">
                <div className="min-w-0 flex-1">
                    <BranchingCanvas
                        graph={graph}
                        displayNode={displayNode}
                        selectedId={selectedId}
                        focusNonce={focusNonce}
                        onSelect={setSelectedId}
                        onMove={movePositions}
                        onConnect={handleConnect}
                        onCreate={handleCreate}
                    />
                </div>

                {selected && (
                    <div className="w-[26rem] max-w-[45%] shrink-0">
                        <NodeEditorPanel
                            projectId={project.id}
                            node={displayNode(selected)}
                            graph={graph}
                            warnings={graph.warnings.filter((warning) => warning.node_id === selected.id)}
                            error={editor.error}
                            displayOption={editor.displayOption}
                            onEdit={(patch, immediate) => editor.editNode(selected.id, patch, immediate)}
                            onEditOption={editor.editOption}
                            onCreateOption={() => void createOption(selected.id, { player_option: __('New option') })}
                            onDeleteOption={(id) => void deleteOption(id)}
                            onDelete={() => void handleDelete()}
                            onClose={() => setSelectedId(null)}
                            onFlush={flush}
                            onOpenVariables={() => setShowVariables(true)}
                            onPlayFromHere={() => void playtest(selected.id)}
                            emotionCatalog={emotionCatalog}
                        />
                    </div>
                )}
            </div>

            {showVariables && (
                <VariablesDialog variables={graph.variables} error={editor.error} onSave={editor.saveVariable} onDelete={editor.deleteVariable} onClose={() => setShowVariables(false)} />
            )}
            {reviewing && (
                <ConsequenceReviewDialog
                    projectId={project.id}
                    beforeReview={flush}
                    onGoToNode={(nodeId) => {
                        setSelectedId(nodeId);
                        setFocusNonce((nonce) => nonce + 1);
                        setReviewing(false);
                    }}
                    onClose={() => setReviewing(false)}
                />
            )}
            {playFrom !== undefined && <PlaytestDialog projectId={project.id} startNodeId={playFrom} onClose={() => setPlayFrom(undefined)} />}
        </ProjectLayout>
    );
}
