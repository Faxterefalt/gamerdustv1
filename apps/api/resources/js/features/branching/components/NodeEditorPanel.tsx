import { __ } from '../../../shared/lib/i18n';
import { Link } from '@inertiajs/react';
import { Flag, Plus, Trash2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { BranchingGraph, GraphNode, GraphOption, GraphWarning, NodePatch, OptionPatch } from '../branching.types';
import type { SaveError } from '../hooks/useBranchingGraph';
import { DIALOGUE_TYPE_STYLE } from '../layout';
import type { DialogueType } from '../../dialogues/dialogues.types';
import NodeAnalysisSection from './NodeAnalysisSection';

interface NodeEditorPanelProps {
    projectId: number;
    node: GraphNode;
    graph: BranchingGraph;
    warnings: GraphWarning[];
    error: SaveError | null;
    displayOption: (option: GraphOption) => GraphOption;
    onEdit: (patch: NodePatch) => void;
    onEditOption: (id: number, patch: OptionPatch, immediate?: boolean) => void;
    onCreateOption: () => void;
    onDeleteOption: (id: number) => void;
    onDelete: () => void;
    onClose: () => void;
    onFlush: () => Promise<void>;
}

const inputClass = 'nodrag nowheel w-full border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-amber-500';

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <label className="block space-y-1 text-xs text-zinc-400">
            <span>{label}</span>
            {children}
            {error && <span className="block text-rose-300">{error}</span>}
        </label>
    );
}

export default function NodeEditorPanel({
    projectId,
    node,
    graph,
    warnings,
    error,
    displayOption,
    onEdit,
    onEditOption,
    onCreateOption,
    onDeleteOption,
    onDelete,
    onClose,
    onFlush,
}: NodeEditorPanelProps) {
    const nodeError = (field: string) => (error?.nodeId === node.id ? error.fields[field]?.[0] : undefined);
    const optionError = (option: GraphOption, field: string) => (error?.optionId === option.id ? error.fields[field]?.[0] : undefined);
    const titles = new Map(graph.nodes.map((candidate) => [candidate.id, candidate.display_title]));
    const incoming = graph.edges.filter((edge) => edge.target === node.id && edge.source !== node.id);

    return (
        <aside className="flex h-full w-full flex-col overflow-y-auto border-l border-zinc-800 bg-zinc-900 text-zinc-200">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-2 border-b border-zinc-800 bg-zinc-900 p-4">
                <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                        {node.is_start && (
                            <span className="flex items-center gap-1 text-amber-400">
                                <Flag size={12} /> {__('Start')}
                            </span>
                        )}
                        <code className="truncate">{node.node_key}</code>
                    </p>
                    <h2 className="truncate font-semibold text-white">{node.display_title}</h2>
                </div>
                <button type="button" onClick={onClose} aria-label={__('Close panel')} className="p-1 text-zinc-400 hover:text-white">
                    <X size={16} />
                </button>
            </div>

            <div className="space-y-4 p-4">
                {error && !error.optionId && (error.nodeId === node.id || error.nodeId === undefined) && (
                    <p className="border border-rose-800 bg-rose-950/50 p-2 text-xs text-rose-200">{error.message}</p>
                )}

                {warnings.length > 0 && (
                    <ul className="space-y-1 text-xs">
                        {warnings.map((warning, index) => (
                            <li key={`${warning.code}-${index}`} className={warning.severity === 'error' ? 'text-rose-300' : warning.severity === 'warning' ? 'text-amber-300' : 'text-zinc-500'}>
                                • {warning.message}
                            </li>
                        ))}
                    </ul>
                )}

                <Field label={__('Title (the stable ID does not change)')} error={nodeError('title')}>
                    <input className={inputClass} value={node.title ?? node.display_title} onChange={(event) => onEdit({ title: event.target.value })} />
                </Field>

                <Field label={__('Text - use {{Passage name}} to create connections')} error={nodeError('text')}>
                    <textarea className={`${inputClass} min-h-40 resize-y`} rows={8} value={node.text} onChange={(event) => onEdit({ text: event.target.value })} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                    <Field label={__('Scene')} error={nodeError('scene_id')}>
                        <select className={inputClass} value={node.scene_id ?? ''} onChange={(event) => onEdit({ scene_id: event.target.value ? Number(event.target.value) : null })}>
                            <option value="">{__('No scene')}</option>
                            {graph.scenes.map((scene) => (
                                <option key={scene.id} value={scene.id}>
                                    {scene.title}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label={__('Character')} error={nodeError('character_id')}>
                        <select className={inputClass} value={node.character_id ?? ''} onChange={(event) => onEdit({ character_id: event.target.value ? Number(event.target.value) : null })}>
                            <option value="">{__('No character')}</option>
                            {graph.characters.map((character) => (
                                <option key={character.id} value={character.id}>
                                    {character.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label={__('Type')} error={nodeError('dialogue_type')}>
                        <select className={inputClass} value={node.dialogue_type} onChange={(event) => onEdit({ dialogue_type: event.target.value as DialogueType })}>
                            {(Object.keys(DIALOGUE_TYPE_STYLE) as DialogueType[]).map((type) => (
                                <option key={type} value={type}>
                                    {__(DIALOGUE_TYPE_STYLE[type].label)}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label={__('Emotional tone')} error={nodeError('emotional_tone')}>
                        <input className={inputClass} value={node.emotional_tone ?? ''} onChange={(event) => onEdit({ emotional_tone: event.target.value })} />
                    </Field>
                </div>

                <Field label={__('Trigger condition')} error={nodeError('trigger_condition')}>
                    <textarea className={`${inputClass} resize-y`} rows={2} value={node.trigger_condition ?? ''} onChange={(event) => onEdit({ trigger_condition: event.target.value })} />
                </Field>

                <section className="space-y-3 border-t border-zinc-800 pt-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white">{__('Options')} ({node.options.length})</h3>
                        <button type="button" onClick={onCreateOption} className="flex items-center gap-1 border border-zinc-700 px-2 py-1 text-xs hover:border-amber-500">
                            <Plus size={12} /> {__('Option')}
                        </button>
                    </div>

                    {node.options.map((raw) => {
                        const option = displayOption(raw);

                        return (
                            <div key={option.id} className="space-y-2 border border-zinc-800 bg-zinc-950 p-3">
                                <div className="flex items-start justify-between gap-2">
                                    {option.managed ? (
                                        <p className="min-w-0 flex-1 text-sm text-white">
                                            <span className="mr-1.5 border border-fuchsia-800 px-1 text-[10px] text-fuchsia-200" title={__('Managed by a {{ }} reference in the text')}>
                                                {'{{ }}'}
                                            </span>
                                            {option.player_option}
                                        </p>
                                    ) : (
                                        <input className={inputClass} value={option.player_option} placeholder={__('Option text')} onChange={(event) => onEditOption(option.id, { player_option: event.target.value })} />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => onDeleteOption(option.id)}
                                        disabled={option.managed}
                                        title={option.managed ? __('Remove the reference from the text to delete it') : __('Delete option')}
                                        className="p-1 text-zinc-400 hover:text-rose-300 disabled:opacity-30"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                {optionError(option, 'player_option') && <p className="text-xs text-rose-300">{optionError(option, 'player_option')}</p>}

                                <Field label={__('Target')} error={optionError(option, 'next_dialogue_node_id')}>
                                    {option.managed ? (
                                        <p className="text-sm text-zinc-300">{option.next_dialogue_node_id ? titles.get(option.next_dialogue_node_id) : __('No target (it will be recreated when the text is saved)')}</p>
                                    ) : (
                                        <select
                                            className={inputClass}
                                            value={option.next_dialogue_node_id ?? ''}
                                            onChange={(event) => onEditOption(option.id, { next_dialogue_node_id: event.target.value ? Number(event.target.value) : null }, true)}
                                        >
                                            <option value="">{__('(no target)')}</option>
                                            {graph.nodes.map((candidate) => (
                                                <option key={candidate.id} value={candidate.id}>
                                                    {candidate.display_title}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </Field>
                                {option.next_dialogue_node_id === null && <p className="text-xs text-rose-300">{__('Option without target.')}</p>}

                                <Field label={__('Consequence')} error={optionError(option, 'consequence')}>
                                    <textarea className={`${inputClass} resize-y`} rows={2} value={option.consequence ?? ''} onChange={(event) => onEditOption(option.id, { consequence: event.target.value })} />
                                </Field>
                                <Field label={__('Required condition')} error={optionError(option, 'required_condition')}>
                                    <input className={inputClass} value={option.required_condition ?? ''} onChange={(event) => onEditOption(option.id, { required_condition: event.target.value })} />
                                </Field>
                            </div>
                        );
                    })}
                    {node.options.length === 0 && <p className="text-xs text-zinc-500">{__('No options. Write {{Name}} in the text or create a manual option.')}</p>}
                </section>

                {incoming.length > 0 && (
                    <section className="space-y-1 border-t border-zinc-800 pt-4 text-xs text-zinc-400">
                        <h3 className="text-sm font-semibold text-white">{__('Incoming')} ({incoming.length})</h3>
                        {incoming.map((edge) => (
                            <p key={edge.id}>
                                {titles.get(edge.source)} → "{edge.label}"
                            </p>
                        ))}
                    </section>
                )}

                <NodeAnalysisSection projectId={projectId} nodeId={node.id} beforeAnalyze={onFlush} />

                <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
                    <Link href={`/projects/${projectId}/dialogues/${node.id}/edit`} className="text-xs text-zinc-400 underline hover:text-white">
                        {__('Open in form')}
                    </Link>
                    <button type="button" onClick={onDelete} className="flex items-center gap-1.5 border border-rose-800 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-950">
                        <Trash2 size={13} /> {__('Delete node')}
                    </button>
                </div>
            </div>
        </aside>
    );
}
