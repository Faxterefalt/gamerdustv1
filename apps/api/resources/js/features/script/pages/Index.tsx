import { Head } from '@inertiajs/react';
import {
    AlignLeft,
    BookOpen,
    Check,
    ChevronDown,
    ChevronRight,
    Cloud,
    FileDown,
    FileText,
    History,
    List,
    LoaderCircle,
    MessageSquare,
    PanelRight,
    Parentheses,
    Plus,
    Redo2,
    Save,
    Sparkles,
    Type,
    Undo2,
    UserRound,
    Wand2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import Modal, { FormError, Pending } from '../../../shared/components/ui';
import useUnsaved from '../../../shared/hooks/useUnsaved';
import { api, ApiError } from '../../../shared/lib/api';
import { __, locale } from '../../../shared/lib/i18n';
import { primarySm, secondary } from '../../../shared/lib/styles';
import type { EmotionCatalog } from '../../analysis/emotion.types';
import type { ProjectComment } from '../../collaboration/collaboration.types';
import { languageLabel } from '../../projects/projectOptions';
import type { Project } from '../../projects/projects.types';
import BlockInput from '../components/BlockInput';
import EmotionPanel from '../components/EmotionPanel';
import RefineDialog from '../components/RefineDialog';
import SceneContext from '../components/SceneContext';
import SceneDialog from '../components/SceneDialog';
import { countWords, sceneCodes, type BlockKind, type LocationReference, type NamedReference, type ScriptBlock, type ScriptScene, type ScriptVersion } from '../script.types';

interface ScriptIndexProps {
    project: Project;
    scenes: ScriptScene[];
    characters: NamedReference[];
    locations: LocationReference[];
    comments: ProjectComment[];
    initialSceneId: number | null;
    emotionCatalog: EmotionCatalog;
}

type Snapshot = { elements: ScriptBlock[]; characters: number[]; location: number | null };

/** Estado de edición de una escena: contenido actual, última versión guardada e historial de deshacer. */
type SceneDoc = { scene: ScriptScene; snapshot: Snapshot; baseline: string; past: Snapshot[]; future: Snapshot[] };

const HISTORY_LIMIT = 80;

// Las etiquetas son claves de traducción.
const TOOLS: { kind: BlockKind; label: string; icon: typeof Type }[] = [
    { kind: 'heading', label: 'Heading', icon: Type },
    { kind: 'action', label: 'Action', icon: AlignLeft },
    { kind: 'character', label: 'Character', icon: UserRound },
    { kind: 'dialogue', label: 'Dialogue', icon: MessageSquare },
    { kind: 'parenthetical', label: 'Parenthetical', icon: Parentheses },
];

function makeDoc(scene: ScriptScene): SceneDoc {
    const snapshot: Snapshot = {
        elements: scene.script.map((block, index) => ({ id: block.id || `${scene.id}-${index}`, kind: block.kind, text: block.text ?? '' })),
        characters: [...scene.character_ids],
        location: scene.location_id,
    };

    return { scene, snapshot, baseline: JSON.stringify(snapshot), past: [], future: [] };
}

const isDirty = (doc: SceneDoc) => JSON.stringify(doc.snapshot) !== doc.baseline;

function errorMessage(caught: unknown): string {
    if (caught instanceof ApiError) {
        return Object.values(caught.errors)[0]?.[0] ?? caught.message;
    }

    return __('Could not save. Check your connection.');
}

export default function Index({ project, scenes, characters, locations, comments, initialSceneId, emotionCatalog }: ScriptIndexProps) {
    const [docs, setDocs] = useState<Record<number, SceneDoc>>(() => Object.fromEntries(scenes.map((scene) => [scene.id, makeDoc(scene)])));
    const [activeId, setActiveId] = useState<number | null>(() => scenes.find((scene) => scene.id === initialSceneId)?.id ?? scenes[0]?.id ?? null);
    const [focused, setFocused] = useState<string | null>(null);
    const [collapsedActs, setCollapsedActs] = useState<string[]>([]);
    const [adding, setAdding] = useState(false);
    const [mobileTree, setMobileTree] = useState(false);
    const [mobileContext, setMobileContext] = useState(false);
    const [versionOpen, setVersionOpen] = useState(false);
    const [versions, setVersions] = useState<ScriptVersion[]>([]);
    const [previewVersion, setPreviewVersion] = useState<number | null>(null);
    const [versionError, setVersionError] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [pending, setPending] = useState(false);
    const [emotionOpen, setEmotionOpen] = useState(false);
    // "Analizar emociones" en la barra: el panel analiza al abrirse (solo para la escena activa).
    const [analyzeRequested, setAnalyzeRequested] = useState(false);
    const consumeAnalyze = useCallback(() => setAnalyzeRequested(false), []);
    const closeEmotions = useCallback(() => setEmotionOpen(false), []);
    // Bloque que se está refinando con IA (copia del borrador en el momento de abrir).
    const [refining, setRefining] = useState<ScriptBlock | null>(null);

    const current = activeId === null ? undefined : docs[activeId];
    const dirty = Object.values(docs).some(isDirty);
    const currentDirty = current ? isDirty(current) : false;
    useUnsaved(dirty);

    // Escenas nuevas que lleguen del servidor (sin pisar los borradores existentes).
    useEffect(() => {
        setDocs((previous) => {
            const missing = scenes.filter((scene) => !previous[scene.id]);

            return missing.length ? { ...previous, ...Object.fromEntries(missing.map((scene) => [scene.id, makeDoc(scene)])) } : previous;
        });
    }, [scenes]);

    const allDocs = useMemo(() => Object.values(docs).sort((a, b) => a.scene.order - b.scene.order || a.scene.id - b.scene.id), [docs]);
    const codes = useMemo(() => sceneCodes(allDocs.map((doc) => doc.scene)), [allDocs]);
    const acts = [...new Set(allDocs.map((doc) => doc.scene.act ?? ''))];
    const actLabel = (act: string) => act || __('No act');

    const run = async (task: () => Promise<void>) => {
        setPending(true);

        try {
            await task();
        } finally {
            setPending(false);
        }
    };

    function change(operation: (snapshot: Snapshot) => Snapshot) {
        if (activeId === null) {
            return;
        }

        setDocs((previous) => {
            const doc = previous[activeId];

            if (!doc) {
                return previous;
            }

            return { ...previous, [activeId]: { ...doc, snapshot: operation(doc.snapshot), past: [...doc.past.slice(-(HISTORY_LIMIT - 1)), doc.snapshot], future: [] } };
        });
        setNotice('');
        setError('');
    }

    function insert(kind: BlockKind) {
        const block: ScriptBlock = { id: crypto.randomUUID(), kind, text: '' };

        change((snapshot) => {
            const elements = [...snapshot.elements];
            const index = elements.findIndex((element) => element.id === focused);
            elements.splice(index < 0 ? elements.length : index + 1, 0, block);

            return { ...snapshot, elements };
        });
        setFocused(block.id);
        requestAnimationFrame(() => document.getElementById(`script-block-${block.id}`)?.focus());
    }

    function undo(redo = false) {
        if (activeId === null) {
            return;
        }

        setDocs((previous) => {
            const doc = previous[activeId];
            const target = doc && (redo ? doc.future : doc.past).at(-1);

            if (!doc || !target) {
                return previous;
            }

            return {
                ...previous,
                [activeId]: {
                    ...doc,
                    snapshot: target,
                    past: redo ? [...doc.past, doc.snapshot] : doc.past.slice(0, -1),
                    future: redo ? doc.future.slice(0, -1) : [...doc.future, doc.snapshot],
                },
            };
        });
        setNotice('');
        setError('');
    }

    function save() {
        if (!current || pending) {
            return;
        }

        const { scene, snapshot } = current;

        void run(async () => {
            try {
                const response = await api<{ scene: ScriptScene }>('PUT', `/projects/${project.id}/script/scenes/${scene.id}`, {
                    updated_at: scene.updated_at,
                    elements: snapshot.elements,
                    characters: snapshot.characters,
                    location_id: snapshot.location,
                });

                setDocs((previous) => {
                    const latest = previous[scene.id];
                    const saved = makeDoc(response.scene);
                    // Si se editó mientras se guardaba, se conserva ese borrador sobre la versión guardada.
                    const editedMeanwhile = latest && JSON.stringify(latest.snapshot) !== JSON.stringify(snapshot);

                    return { ...previous, [scene.id]: editedMeanwhile ? { ...saved, snapshot: latest.snapshot, past: latest.past, future: latest.future } : saved };
                });
                setNotice(__('Scene saved.'));
                setError('');
            } catch (caught) {
                setError(errorMessage(caught));
            }
        });
    }

    function selectScene(sceneId: number) {
        setActiveId(sceneId);
        setMobileTree(false);
        setFocused(null);
        setNotice('');
        setError('');
        const url = new URL(window.location.href);
        url.searchParams.set('scene', String(sceneId));
        window.history.replaceState(window.history.state, '', url);
    }

    function openVersions() {
        if (!current) {
            return;
        }

        setVersionOpen(true);
        setVersionError('');
        setVersions([]);
        setPreviewVersion(null);

        void run(async () => {
            try {
                const response = await api<{ versions: ScriptVersion[] }>('GET', `/projects/${project.id}/script/scenes/${current.scene.id}/versions`);
                setVersions(response.versions);
                setPreviewVersion(response.versions[0]?.id ?? null);
            } catch (caught) {
                setVersionError(errorMessage(caught));
            }
        });
    }

    function restore(version: ScriptVersion) {
        if (!current || !confirm(__('Restore this revision? Your unsaved changes in this scene will be replaced.'))) {
            return;
        }

        const sceneId = current.scene.id;

        void run(async () => {
            try {
                const response = await api<{ scene: ScriptScene }>('POST', `/projects/${project.id}/script/scenes/${sceneId}/versions/${version.id}/restore`);
                setDocs((previous) => ({ ...previous, [sceneId]: makeDoc(response.scene) }));
                setVersionOpen(false);
                setNotice(__('Version restored.'));
            } catch (caught) {
                setVersionError(errorMessage(caught));
            }
        });
    }

    function exportPdf() {
        if (dirty && !confirm(__('The PDF only includes saved content. You have unsaved changes; do you want to continue anyway?'))) {
            return;
        }

        window.open(`/projects/${project.id}/script/print`, '_blank', 'noopener');
    }

    const tree = (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-5">
                <span className="font-mono text-[8px] tracking-[.17em] text-[#a1b594]">{__('STRUCTURE')}</span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[8px] text-primary">{String(allDocs.length).padStart(2, '0')}</span>
            </div>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-5">
                {acts.map((act) => {
                    const collapsed = collapsedActs.includes(act);

                    return (
                        <section key={act || '__none'}>
                            <button
                                type="button"
                                disabled={pending}
                                onClick={() => setCollapsedActs((previous) => (previous.includes(act) ? previous.filter((item) => item !== act) : [...previous, act]))}
                                aria-expanded={!collapsed}
                                className="flex w-full items-start justify-between gap-2 px-4 text-left text-[11px] font-medium leading-6 text-[#d1ddc7]"
                            >
                                <span>{actLabel(act)}</span>
                                {collapsed ? <ChevronRight size={14} className="mt-1 shrink-0" /> : <ChevronDown size={14} className="mt-1 shrink-0" />}
                            </button>
                            {!collapsed && (
                                <div className="mt-3 space-y-1 px-2">
                                    {allDocs
                                        .filter((doc) => (doc.scene.act ?? '') === act)
                                        .map((doc) => {
                                            const selected = doc.scene.id === activeId;

                                            return (
                                                <button
                                                    key={doc.scene.id}
                                                    type="button"
                                                    disabled={pending}
                                                    onClick={() => selectScene(doc.scene.id)}
                                                    aria-current={selected ? 'true' : undefined}
                                                    className={`flex min-h-11 w-full items-start gap-2 rounded-md border-l-2 px-2.5 py-3 text-left transition ${
                                                        selected ? 'border-primary bg-primary/10 text-primary' : 'border-transparent text-[#9daf92] hover:bg-white/[.03] hover:text-foreground'
                                                    }`}
                                                >
                                                    <FileText size={13} className="mt-0.5 shrink-0" />
                                                    <span className="min-w-0 text-[10px] leading-5">
                                                        <span className="mr-1.5 font-mono text-[9px]">{codes.get(doc.scene.id)}</span>
                                                        {doc.scene.title}
                                                    </span>
                                                    {isDirty(doc) && <span aria-label={__('Unsaved')} className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />}
                                                </button>
                                            );
                                        })}
                                </div>
                            )}
                        </section>
                    );
                })}
                {!allDocs.length && <p className="px-4 text-[11px] leading-6 text-[#9faf92]">{__('A new story awaits its first scene.')}</p>}
            </div>
            <div className="border-t border-border p-4">
                <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                        setMobileTree(false);
                        setAdding(true);
                    }}
                    className={`${secondary} w-full border-dashed !px-2 !text-[10px]`}
                >
                    <Plus size={14} /> {__('Add scene')}
                </button>
                <p className="mt-4 text-[8px] leading-5 text-[#91a484]">{__('Scenes share characters and locations with your Narrative Bible.')}</p>
            </div>
        </div>
    );

    const context = current ? (
        <SceneContext
            projectId={project.id}
            sceneId={current.scene.id}
            characters={characters}
            locations={locations}
            comments={comments}
            characterIds={current.snapshot.characters}
            locationId={current.snapshot.location}
            disabled={pending}
            onChange={(linked, location) => change((snapshot) => ({ ...snapshot, characters: linked, location }))}
        />
    ) : null;

    const wordCount = current ? countWords(current.snapshot.elements.map((element) => element.text).join(' ')) : 0;
    const focusedBlock = current?.snapshot.elements.find((element) => element.id === focused);
    const focusedKind = focusedBlock?.kind;
    const canRefine = Boolean(focusedBlock && focusedBlock.kind !== 'character' && focusedBlock.text.trim());
    const selectedVersion = versions.find((version) => version.id === previewVersion);
    const toolLabel = (kind: BlockKind) => __(TOOLS.find((tool) => tool.kind === kind)!.label);
    const dateLocale = locale === 'en' ? 'en-US' : 'es-ES';

    return (
        <ProjectLayout bare>
            <Head title={`${__('Script')} - ${project.title}`} />
            <div
                className="flex min-h-[calc(100dvh-139px)] flex-col bg-[#111812]"
                onKeyDown={(event) => {
                    const mod = event.ctrlKey || event.metaKey;

                    if (mod && event.key.toLowerCase() === 's') {
                        event.preventDefault();
                        save();
                    }

                    if (mod && event.key.toLowerCase() === 'z' && !pending) {
                        event.preventDefault();
                        undo(event.shiftKey);
                    }
                }}
            >
                <div className="flex flex-wrap items-center justify-between gap-4 px-5 pb-4 pt-6 sm:px-6">
                    <div>
                        <p className="mb-2 font-mono text-[8px] tracking-[.18em] text-[#91a883]">{__('GIVE VOICE TO YOUR UNIVERSE')}</p>
                        <h1 className="font-display text-[25px] font-medium tracking-[-.03em]">
                            {__('Script editor')}
                            <span className="ml-3 hidden align-middle font-mono text-[8px] tracking-wider text-[#90a081] sm:inline">/ {project.title}</span>
                        </h1>
                    </div>
                    <div role="status" className="flex items-center gap-2 text-[10px] text-[#9fb68f]">
                        {pending ? <LoaderCircle size={13} className="animate-spin" /> : currentDirty ? <span className="h-1.5 w-1.5 rounded-full bg-primary" /> : <Cloud size={14} />}
                        {pending ? __('Processing…') : currentDirty ? __('Unsaved changes') : __('All changes saved')}
                    </div>
                </div>

                <div role="toolbar" aria-label={__('Script tools')} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-y border-border bg-[#182019] px-4 py-3 sm:px-6">
                    <div className="flex flex-wrap gap-1.5">
                        {TOOLS.map(({ kind, label, icon: Icon }) => (
                            <button
                                key={kind}
                                type="button"
                                disabled={!current || pending}
                                title={__('Add :block block', { block: __(label).toLocaleLowerCase() })}
                                onClick={() => insert(kind)}
                                className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-2.5 py-2 text-[10px] transition disabled:opacity-35 ${
                                    focusedKind === kind ? 'border-primary/35 bg-primary/10 text-primary' : 'border-[#3a4835] text-[#c1cfb7] hover:border-primary/40 hover:bg-primary/5'
                                }`}
                            >
                                <Icon size={14} strokeWidth={1.6} />
                                {__(label)}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            type="button"
                            aria-label={__('Undo')}
                            title={__('Undo (Ctrl+Z)')}
                            className={`${secondary} !min-h-9 !px-2.5`}
                            disabled={!current?.past.length || pending}
                            onClick={() => undo()}
                        >
                            <Undo2 size={15} />
                        </button>
                        <button
                            type="button"
                            aria-label={__('Redo')}
                            title={__('Redo (Ctrl+Shift+Z)')}
                            className={`${secondary} !min-h-9 !px-2.5`}
                            disabled={!current?.future.length || pending}
                            onClick={() => undo(true)}
                        >
                            <Redo2 size={15} />
                        </button>
                        <span className="mx-1 h-5 w-px bg-border" />
                        <button
                            type="button"
                            disabled={!current || pending}
                            title={__('The analysis uses the saved version of the scene.')}
                            className={`${secondary} !min-h-9 !px-2.5 !text-[10px]`}
                            onClick={() => {
                                setEmotionOpen(true);
                                setAnalyzeRequested(true);
                            }}
                        >
                            <Sparkles size={14} /> {__('Analyze emotions')}
                        </button>
                        <button
                            type="button"
                            disabled={!canRefine || pending}
                            title={canRefine ? __('Propose an alternative for the selected block') : __('Select a block with text to refine it')}
                            className={`${secondary} !min-h-9 !px-2.5 !text-[10px]`}
                            onClick={() => focusedBlock && setRefining({ ...focusedBlock })}
                        >
                            <Wand2 size={14} /> {__('Refine with AI')}
                        </button>
                        <button type="button" disabled={!current || pending} className={`${secondary} !min-h-9 !px-2.5 !text-[10px]`} onClick={openVersions}>
                            <History size={14} /> {__('Versions')}
                        </button>
                        <button type="button" disabled={!allDocs.length} className={`${secondary} !min-h-9 !px-2.5 !text-[10px]`} onClick={exportPdf}>
                            <FileDown size={14} /> {__('Export PDF')}
                        </button>
                        <button type="button" disabled={!current || pending} onClick={save} className={`${primarySm} !min-h-9 !px-3 !py-2 !text-[10px]`}>
                            <Save size={13} /> {__('Save')}
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-b border-border bg-[#151e16] px-4 py-2.5 md:hidden">
                    <button type="button" className="flex items-center gap-2 text-[10px] text-primary" onClick={() => setMobileTree(true)}>
                        <List size={14} /> {__('Scenes')} ({allDocs.length})
                    </button>
                    <button type="button" className="flex items-center gap-2 text-[10px] text-[#bdcdb2]" onClick={() => setMobileContext(true)} disabled={!current}>
                        <PanelRight size={14} /> {__('Context and comments')}
                    </button>
                </div>

                {(error || notice) && (
                    <div className="border-b border-border px-5 pb-4">
                        <FormError error={error} />
                        {notice && (
                            <p role="status" className="mt-4 flex items-center gap-2 text-xs text-primary">
                                <Check size={13} />
                                {notice}
                            </p>
                        )}
                    </div>
                )}

                <div className="flex flex-1 items-stretch">
                    <aside aria-label={__('Script structure')} className="hidden w-[190px] shrink-0 border-r border-border bg-[#131b14] md:block">
                        {tree}
                    </aside>

                    <div className="flex min-w-0 flex-1 flex-col bg-[#1d261d]">
                        {current ? (
                            <>
                                <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-[#35412e] px-4 py-2 text-[9px] text-[#a0b28f]">
                                    <span className="flex min-w-0 items-center gap-2">
                                        <FileText size={12} className="shrink-0" />
                                        <span className="truncate">
                                            {codes.get(current.scene.id)} — {current.scene.title}
                                        </span>
                                    </span>
                                    <button type="button" onClick={() => setMobileContext(true)} className="hidden items-center gap-1.5 text-primary md:flex xl:hidden">
                                        <PanelRight size={13} /> {__('Context and comments')}
                                    </button>
                                    <span className="ml-auto font-mono text-[8px] tracking-wider">
                                        {__('SCRIPT')} / {languageLabel(project.language ?? 'es').toLocaleUpperCase(locale)}
                                    </span>
                                </div>
                                <div className="flex-1 px-3 py-5 sm:px-6 sm:py-7">
                                    <section
                                        aria-label={__('Script of :scene', { scene: current.scene.title })}
                                        className="mx-auto min-h-[620px] w-full max-w-[740px] rounded-sm border border-[#d9dfcf] bg-[#eef0e7] px-8 pb-20 pt-10 font-mono text-[#26301f] shadow-[0_8px_35px_rgba(0,0,0,.15)] sm:px-10 sm:pt-12 xl:min-h-[720px] xl:px-12"
                                    >
                                        <div className="mb-8 flex items-center justify-between gap-3 border-b border-[#d4dbca] pb-4 font-mono text-[8px] tracking-[.12em] text-[#56644b]">
                                            <span>GAMERDUST / {codes.get(current.scene.id)}</span>
                                            <span>01</span>
                                        </div>
                                        {current.snapshot.elements.map((block, index) => (
                                            <BlockInput
                                                key={block.id}
                                                block={block}
                                                label={toolLabel(block.kind)}
                                                index={index}
                                                disabled={pending}
                                                onFocus={() => setFocused(block.id)}
                                                onChange={(text) =>
                                                    change((snapshot) => ({
                                                        ...snapshot,
                                                        elements: snapshot.elements.map((element) => (element.id === block.id ? { ...element, text } : element)),
                                                    }))
                                                }
                                                onRemove={() => change((snapshot) => ({ ...snapshot, elements: snapshot.elements.filter((element) => element.id !== block.id) }))}
                                            />
                                        ))}
                                        {!current.snapshot.elements.length && (
                                            <button type="button" onClick={() => insert('heading')} className="flex w-full flex-col items-center gap-4 py-16 text-center text-[#627358]">
                                                <Type size={25} />
                                                <span className="text-xs">{__('Add a heading to start this scene.')}</span>
                                            </button>
                                        )}
                                    </section>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#35412e] px-5 py-3 font-mono text-[8px] tracking-wider text-[#a7b99a]">
                                    <span>{__(':words WORDS · :blocks BLOCKS', { words: wordCount, blocks: current.snapshot.elements.length })}</span>
                                    <span>{__('CTRL / ⌘ + S TO SAVE')}</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex min-h-[550px] flex-col items-center justify-center px-8 py-16 text-center">
                                <BookOpen size={38} strokeWidth={1.2} className="text-primary" />
                                <h2 className="mt-6 font-display text-2xl">{__('The first chapter is yours.')}</h2>
                                <p className="mt-3 max-w-sm text-xs leading-7 text-[#a6b99a]">
                                    {__('Create a scene to start writing. The characters and locations of your Narrative Bible will be one click away.')}
                                </p>
                                <button type="button" className={`${primarySm} mt-7`} onClick={() => setAdding(true)}>
                                    <Plus size={14} /> {__('Add first scene')}
                                </button>
                            </div>
                        )}
                    </div>

                    <aside aria-label={__('Scene context')} className="hidden w-[248px] shrink-0 border-l border-border bg-[#151d16] xl:block">
                        {context}
                    </aside>
                </div>
            </div>

            {emotionOpen && current && (
                <EmotionPanel
                    key={current.scene.id}
                    projectId={project.id}
                    sceneId={current.scene.id}
                    sceneCode={codes.get(current.scene.id) ?? ''}
                    dirty={currentDirty}
                    catalog={emotionCatalog}
                    pendingAnalyze={analyzeRequested}
                    onConsumed={consumeAnalyze}
                    onClose={closeEmotions}
                />
            )}

            {refining && current && (
                <RefineDialog
                    projectId={project.id}
                    sceneId={current.scene.id}
                    block={refining}
                    blockLabel={toolLabel(refining.kind)}
                    characters={characters.filter((character) => current.snapshot.characters.includes(character.id))}
                    catalog={emotionCatalog}
                    onClose={() => setRefining(null)}
                    onApply={(text) => {
                        // Solo el borrador local: entra en deshacer/rehacer y se guarda con Guardar.
                        change((snapshot) => ({
                            ...snapshot,
                            elements: snapshot.elements.map((element) => (element.id === refining.id ? { ...element, text } : element)),
                        }));
                        setRefining(null);
                        setNotice(__('Proposal applied to your draft. Press Save to keep it.'));
                    }}
                />
            )}

            {adding && (
                <SceneDialog
                    projectId={project.id}
                    act={current?.scene.act ?? allDocs.at(-1)?.scene.act ?? ''}
                    onClose={() => setAdding(false)}
                    onCreated={(scene) => {
                        setDocs((previous) => ({ ...previous, [scene.id]: makeDoc(scene) }));
                        selectScene(scene.id);
                        setNotice(__('Scene created.'));
                    }}
                />
            )}

            {mobileTree && (
                <Modal title={__('Script scenes')} onClose={() => setMobileTree(false)}>
                    {tree}
                </Modal>
            )}

            {mobileContext && context && (
                <Modal title={__('Context and comments')} onClose={() => setMobileContext(false)}>
                    {context}
                </Modal>
            )}

            {versionOpen && (
                <Modal
                    title={__('Scene versions')}
                    wide
                    onClose={() => {
                        if (!pending) setVersionOpen(false);
                    }}
                >
                    <p className="mb-5 text-xs leading-6 text-[#a2b697]">{__('Each save creates a revision. Restoring a version keeps a revision of the current state.')}</p>
                    {pending && (
                        <p role="status" className="flex items-center gap-2 text-xs text-primary">
                            <LoaderCircle size={14} className="animate-spin" /> {__('Loading…')}
                        </p>
                    )}
                    <FormError error={versionError} />
                    {!pending && !versions.length && !versionError && <p className="text-xs text-[#a2b697]">{__('This scene has no revisions yet.')}</p>}
                    {versions.length > 0 && (
                        <div className="grid gap-4 sm:grid-cols-[170px_1fr]">
                            <div className="max-h-72 space-y-2 overflow-y-auto">
                                {versions.map((version, index) => (
                                    <button
                                        key={version.id}
                                        type="button"
                                        disabled={pending}
                                        onClick={() => setPreviewVersion(version.id)}
                                        className={`w-full rounded-md border p-3 text-left ${previewVersion === version.id ? 'border-primary/35 bg-primary/5 text-primary' : 'border-border text-[#adbea1]'}`}
                                    >
                                        <span className="block text-[10px]">{index === 0 ? __('Most recent') : __('Revision :number', { number: versions.length - index })}</span>
                                        <span className="mt-1 block text-[9px] leading-5">
                                            {version.created_at && new Date(version.created_at).toLocaleString(dateLocale)}
                                            {version.author ? ` · ${version.author}` : ''}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            {selectedVersion && (
                                <div>
                                    <div className="max-h-72 overflow-y-auto rounded-md border border-border bg-background p-4">
                                        <h3 className="mb-3 text-xs text-primary">{selectedVersion.title}</h3>
                                        {selectedVersion.script.map((element, index) => (
                                            <p key={index} className="mb-3 whitespace-pre-wrap break-words font-mono text-[10px] leading-6 text-[#c2cfb8]">
                                                {element.text}
                                            </p>
                                        ))}
                                    </div>
                                    <button type="button" disabled={pending} className={`${primarySm} mt-4 w-full`} onClick={() => restore(selectedVersion)}>
                                        <Pending pending={pending}>{__('Restore this version')}</Pending>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </Modal>
            )}
        </ProjectLayout>
    );
}
