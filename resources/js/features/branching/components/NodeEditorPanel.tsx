import { __ } from '../../../shared/lib/i18n';
import { Link } from '@inertiajs/react';
import { BookOpen, Flag, Play, Plus, Trash2, UserRound, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import LinkPicker from '../../../shared/components/LinkPicker';
import Modal from '../../../shared/components/ui';
import useEditLock from '../../../shared/hooks/useEditLock';
import useProjectAccess from '../../../shared/hooks/useProjectAccess';
import type { BranchingGraph, GraphNode, GraphOption, GraphWarning, NodePatch, OptionPatch } from '../branching.types';
import type { SaveError } from '../hooks/useBranchingGraph';
import { DIALOGUE_TYPE_STYLE } from '../layout';
import type { DialogueType } from '../../dialogues/dialogues.types';
import type { EmotionCatalog } from '../../analysis/emotion.types';
import NodeAnalysisSection from './NodeAnalysisSection';
import OptionLogicEditor from './OptionLogicEditor';
import { dangerButton, iconButton, secondary } from '../../../shared/lib/styles';

// Claves de traducción de los tipos de entrada de la Biblia que se pueden vincular.
const LORE_TYPE_LABEL: Record<string, string> = { location: 'Place', rule: 'World rule' };

interface NodeEditorPanelProps {
    projectId: number;
    node: GraphNode;
    graph: BranchingGraph;
    warnings: GraphWarning[];
    error: SaveError | null;
    displayOption: (option: GraphOption) => GraphOption;
    onEdit: (patch: NodePatch, immediate?: boolean) => void;
    onEditOption: (id: number, patch: OptionPatch, immediate?: boolean) => void;
    onCreateOption: () => void;
    onDeleteOption: (id: number) => void;
    onDelete: () => void;
    onClose: () => void;
    onFlush: () => Promise<void>;
    onOpenVariables: () => void;
    onPlayFromHere: () => void;
    emotionCatalog: EmotionCatalog;
}

const inputClass = 'nodrag nowheel w-full border border-border-strong bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary';

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <label className="block space-y-1 text-xs text-muted">
            <span>{label}</span>
            {children}
            {error && <span className="block text-danger">{error}</span>}
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
    onOpenVariables,
    onPlayFromHere,
    emotionCatalog,
}: NodeEditorPanelProps) {
    const [linking, setLinking] = useState(false);
    // Bloqueo blando del nodo abierto (HU 26): avisa si otra persona lo está editando.
    const access = useProjectAccess();
    const lockHolder = useEditLock(projectId, 'node', node.id, access.can_update);
    const loreTitles = new Map(graph.lore_entries.map((entry) => [entry.id, entry.title]));
    const toggleLore = (id: number, on: boolean) =>
        onEdit({ lore_entry_ids: on ? [...node.lore_entry_ids, id] : node.lore_entry_ids.filter((current) => current !== id) });
    const nodeError = (field: string) => (error?.nodeId === node.id ? error.fields[field]?.[0] : undefined);
    const optionError = (option: GraphOption, field: string) => (error?.optionId === option.id ? error.fields[field]?.[0] : undefined);
    const titles = new Map(graph.nodes.map((candidate) => [candidate.id, candidate.display_title]));
    const incoming = graph.edges.filter((edge) => edge.target === node.id && edge.source !== node.id);

    return (
        <aside className="flex h-full w-full flex-col overflow-y-auto border-l border-border bg-surface text-foreground">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-2 border-b border-border bg-surface p-4">
                <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs text-subtle">
                        {node.is_start && (
                            <span className="flex items-center gap-1 text-primary" title={node.start_marked ? undefined : __('No node is marked as start: the oldest one is used.')}>
                                <Flag size={12} /> {__('Start')}
                            </span>
                        )}
                        {node.is_ending && <span className="text-success">{__('Ending')}</span>}
                        <code className="truncate">{node.node_key}</code>
                    </p>
                    <h2 className="truncate font-semibold text-foreground">{node.display_title}</h2>
                </div>
                <button type="button" onClick={onClose} aria-label={__('Close panel')} className={iconButton}>
                    <X size={16} />
                </button>
            </div>

            <div className="space-y-4 p-4">
                {lockHolder && (
                    <p role="status" className="flex items-start gap-2 rounded-md border border-warning/50 bg-warning/10 p-2 text-sm text-foreground">
                        <UserRound size={14} className="mt-0.5 shrink-0" />
                        {__(':name is editing this node right now. Changes are saved automatically: the last one to write wins.', { name: lockHolder.name })}
                    </p>
                )}
                {error && !error.optionId && (error.nodeId === node.id || error.nodeId === undefined) && (
                    <p className="rounded-md border border-danger/50 bg-danger/10 p-2 text-sm text-danger">{error.message}</p>
                )}

                {warnings.length > 0 && (
                    <ul className="space-y-1 text-xs">
                        {warnings.map((warning, index) => (
                            <li key={`${warning.code}-${index}`} className={warning.severity === 'error' ? 'text-danger' : warning.severity === 'warning' ? 'text-primary' : 'text-subtle'}>
                                • {warning.message}
                            </li>
                        ))}
                    </ul>
                )}

                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
                    <label className="flex items-center gap-2" title={__('Only one node can be the start. Without a marked start, the oldest node is used.')}>
                        <input type="checkbox" className="nodrag accent-primary" checked={node.start_marked} onChange={(event) => onEdit({ is_start: event.target.checked }, true)} />
                        {__('Start node')}
                    </label>
                    <label className="flex items-center gap-2" title={__('An ending does not warn about missing outgoing options.')}>
                        <input type="checkbox" className="nodrag accent-primary" checked={node.is_ending} onChange={(event) => onEdit({ is_ending: event.target.checked }, true)} />
                        {__('Ending')}
                    </label>
                    <button type="button" onClick={onPlayFromHere} className="ml-auto flex items-center gap-1 text-primary hover:text-foreground">
                        <Play size={12} /> {__('Play from here')}
                    </button>
                </div>

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

                <section className="space-y-2 border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                            <BookOpen size={14} /> {__('Narrative Bible')} ({node.lore_entry_ids.length})
                        </h3>
                        <button type="button" onClick={() => setLinking(true)} className={secondary}>
                            <Plus size={12} /> {__('Link')}
                        </button>
                    </div>
                    {nodeError('lore_entry_ids') && <p className="text-xs text-danger">{nodeError('lore_entry_ids')}</p>}
                    <div className="flex flex-wrap gap-1.5">
                        {node.lore_entry_ids.map((id) => (
                            <span key={id} className="flex items-center gap-1 border border-border-strong px-1.5 py-0.5 text-xs text-muted">
                                {loreTitles.get(id) ?? `#${id}`}
                                <button type="button" aria-label={__('Unlink :name', { name: loreTitles.get(id) ?? id })} onClick={() => toggleLore(id, false)} className="text-subtle hover:text-danger">
                                    <X size={11} />
                                </button>
                            </span>
                        ))}
                        {!node.lore_entry_ids.length && <p className="text-xs text-subtle">{__('Link the places, rules or lore this passage depends on.')}</p>}
                    </div>
                </section>

                <section className="space-y-3 border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">{__('Options')} ({node.options.length})</h3>
                        <button type="button" onClick={onCreateOption} className={secondary}>
                            <Plus size={12} /> {__('Option')}
                        </button>
                    </div>

                    {node.options.map((raw) => {
                        const option = displayOption(raw);

                        return (
                            <div key={option.id} className="space-y-2 border border-border bg-background p-3">
                                <div className="flex items-start justify-between gap-2">
                                    {option.managed ? (
                                        <p className="min-w-0 flex-1 text-sm text-foreground">
                                            <span className="mr-1.5 border border-ember/50 px-1 text-xs text-ember" title={__('Managed by a {{ }} reference in the text')}>
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
                                        className={`${iconButton} hover:text-danger`}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                {optionError(option, 'player_option') && <p className="text-xs text-danger">{optionError(option, 'player_option')}</p>}

                                <Field label={__('Target')} error={optionError(option, 'next_dialogue_node_id')}>
                                    {option.managed ? (
                                        <p className="text-sm text-muted">{option.next_dialogue_node_id ? titles.get(option.next_dialogue_node_id) : __('No target (it will be recreated when the text is saved)')}</p>
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
                                {option.next_dialogue_node_id === null && <p className="text-xs text-danger">{__('Option without target.')}</p>}

                                <OptionLogicEditor
                                    option={option}
                                    variables={graph.variables}
                                    onChange={(patch) => onEditOption(option.id, patch, true)}
                                    onOpenVariables={onOpenVariables}
                                />
                                {Object.entries(error?.optionId === option.id ? error.fields : {})
                                    .filter(([name]) => name.startsWith('condition') || name.startsWith('effects'))
                                    .map(([name, messages]) => (
                                        <p key={name} className="text-xs text-danger">
                                            {messages[0]}
                                        </p>
                                    ))}

                                <details className="text-xs text-muted">
                                    <summary className="cursor-pointer">{__('Author notes')}</summary>
                                    <div className="mt-2 space-y-2">
                                        <Field label={__('Consequence')} error={optionError(option, 'consequence')}>
                                            <textarea className={`${inputClass} resize-y`} rows={2} value={option.consequence ?? ''} onChange={(event) => onEditOption(option.id, { consequence: event.target.value })} />
                                        </Field>
                                        <Field label={__('Required condition')} error={optionError(option, 'required_condition')}>
                                            <input className={inputClass} value={option.required_condition ?? ''} onChange={(event) => onEditOption(option.id, { required_condition: event.target.value })} />
                                        </Field>
                                    </div>
                                </details>
                            </div>
                        );
                    })}
                    {node.options.length === 0 && <p className="text-xs text-subtle">{__('No options. Write {{Name}} in the text or create a manual option.')}</p>}
                </section>

                {incoming.length > 0 && (
                    <section className="space-y-1 border-t border-border pt-4 text-xs text-muted">
                        <h3 className="text-sm font-semibold text-foreground">{__('Incoming')} ({incoming.length})</h3>
                        {incoming.map((edge) => (
                            <p key={edge.id}>
                                {titles.get(edge.source)} → "{edge.label}"
                            </p>
                        ))}
                    </section>
                )}

                <NodeAnalysisSection projectId={projectId} nodeId={node.id} catalog={emotionCatalog} beforeAnalyze={onFlush} />

                <div className="flex items-center justify-between border-t border-border pt-4">
                    <Link href={`/projects/${projectId}/dialogues/${node.id}/edit`} className="text-xs text-muted underline hover:text-foreground">
                        {__('Open in form')}
                    </Link>
                    <button type="button" onClick={onDelete} className={dangerButton}>
                        <Trash2 size={13} /> {__('Delete node')}
                    </button>
                </div>
            </div>
            {linking && (
                <Modal title={__('Link to the Narrative Bible')} onClose={() => setLinking(false)}>
                    <LinkPicker
                        options={graph.lore_entries.map((entry) => ({ id: entry.id, label: entry.title, hint: LORE_TYPE_LABEL[entry.type] ? __(LORE_TYPE_LABEL[entry.type]) : null }))}
                        checked={node.lore_entry_ids}
                        onToggle={toggleLore}
                        onDone={() => setLinking(false)}
                        empty={
                            <Link href={`/projects/${projectId}/bible`} className="underline">
                                {__('There are no Bible entries in this project yet.')}
                            </Link>
                        }
                        note={__('Links are saved automatically.')}
                    />
                </Modal>
            )}
        </aside>
    );
}
