import { Head, usePage } from '@inertiajs/react';
import {
    AlignLeft,
    BookOpen,
    Check,
    ChevronDown,
    ChevronRight,
    CircleAlert,
    Cloud,
    FileDown,
    FileText,
    GitCompare,
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import Modal, { FormError, Pending } from '../../../shared/components/ui';
import useEditLock from '../../../shared/hooks/useEditLock';
import useProjectAccess from '../../../shared/hooks/useProjectAccess';
import useUnsaved from '../../../shared/hooks/useUnsaved';
import { api, ApiError } from '../../../shared/lib/api';
import { __, choice, locale } from '../../../shared/lib/i18n';
import { primarySm, secondary } from '../../../shared/lib/styles';
import type { EmotionCatalog } from '../../analysis/emotion.types';
import type { ProjectComment } from '../../collaboration/collaboration.types';
import { languageLabel } from '../../projects/projectOptions';
import type { PageProps, Project } from '../../projects/projects.types';
import BlockInput from '../components/BlockInput';
import ConflictDialog from '../components/ConflictDialog';
import EmotionPanel from '../components/EmotionPanel';
import RefineDialog from '../components/RefineDialog';
import SceneContext from '../components/SceneContext';
import SceneDialog from '../components/SceneDialog';
import VersionDiff from '../components/VersionDiff';
import { localDrafts, type LocalDraft } from '../lib/localDrafts';
import { matchCharacterLine, NEXT_KIND } from '../lib/scriptFormat';
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

/** 409 al guardar (HU 26): la versión que guardó otra persona. */
type SaveConflict = { sceneId: number; theirs: ScriptScene; savedBy: string | null };

/** Texto plano de los bloques para "Copiar mi versión". */
const plainText = (blocks: ScriptBlock[]) =>
    blocks
        .filter((block) => block.text.trim() !== '')
        .map((block) => (block.kind === 'character' || block.kind === 'heading' ? block.text.toUpperCase() : block.text))
        .join('\n\n');

/** Borrador local más reciente que la versión del servidor, pendiente de recuperar o descartar. */
type DraftOffer = { sceneId: number; draft: LocalDraft; conflict: boolean };

const LOCAL_DELAY = 700;

/**
 * Borradores del navegador al abrir el editor (HU 24): se ofrecen los más recientes que la versión guardada
 * y distintos de ella; el resto se limpian.
 */
function findOffers(userId: number | null, scenes: ScriptScene[]): DraftOffer[] {
    if (userId === null) {
        return [];
    }

    return scenes.flatMap((scene) => {
        const draft = localDrafts.read(userId, scene.id);

        if (!draft) {
            return [];
        }

        const serverTime = scene.updated_at ? Date.parse(scene.updated_at) : 0;

        if (JSON.stringify(draft.snapshot) === makeDoc(scene).baseline || draft.saved_at <= serverTime) {
            localDrafts.remove(userId, scene.id);

            return [];
        }

        return [{ sceneId: scene.id, draft, conflict: draft.base_updated_at !== scene.updated_at }];
    });
}

function errorMessage(caught: unknown): string {
    if (caught instanceof ApiError) {
        return Object.values(caught.errors)[0]?.[0] ?? caught.message;
    }

    return __('Could not save. Check your connection.');
}

export default function Index({ project, scenes, characters, locations, comments, initialSceneId, emotionCatalog }: ScriptIndexProps) {
    const userId = usePage<PageProps>().props.auth.user?.id ?? null;
    const [offers, setOffers] = useState<DraftOffer[]>(() => findOffers(userId, scenes));
    // Escenas cuyo último guardado en el servidor falló (el indicador nunca dice "guardado").
    const [failed, setFailed] = useState<Record<number, boolean>>({});
    // ¿Se pudo guardar el borrador en este navegador? (false en modo privado o sin espacio).
    const [localOk, setLocalOk] = useState(true);
    const [compareWith, setCompareWith] = useState<'current' | number | null>(null);
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
    // Bloque que se está refinando con IA (copia del borrador en el momento de abrir) y, desde "Usar como
    // base", la sugerencia como instrucción y los bloques entre los que elegir.
    const [refining, setRefining] = useState<ScriptBlock | null>(null);
    const [refineFrom, setRefineFrom] = useState<{ instruction: string; choices: ScriptBlock[] } | null>(null);
    const [conflict, setConflict] = useState<SaveConflict | null>(null);
    const access = useProjectAccess();
    // Bloqueo blando de la escena abierta: quién más la está editando (HU 26).
    const lockHolder = useEditLock(project.id, 'scene', activeId, access.can_update);

    const current = activeId === null ? undefined : docs[activeId];
    const dirty = Object.values(docs).some(isDirty);
    const currentDirty = current ? isDirty(current) : false;
    const currentFailed = Boolean(current && failed[current.scene.id] && currentDirty);
    useUnsaved(dirty);

    // Autoguardado local con debounce: los borradores con cambios se copian al navegador y los ya guardados se
    // borran. Las escenas con un borrador pendiente de recuperar no se tocan hasta que el autor decida.
    const docsRef = useRef(docs);
    docsRef.current = docs;
    const offersRef = useRef(offers);
    offersRef.current = offers;

    const persistLocal = useCallback(() => {
        if (userId === null) {
            return;
        }

        const waiting = new Set(offersRef.current.map((offer) => offer.sceneId));
        let ok = true;

        for (const doc of Object.values(docsRef.current)) {
            if (waiting.has(doc.scene.id)) {
                continue;
            }

            if (isDirty(doc)) {
                ok = localDrafts.write(userId, doc.scene.id, { snapshot: doc.snapshot, base_updated_at: doc.scene.updated_at, saved_at: Date.now() }) && ok;
            } else {
                localDrafts.remove(userId, doc.scene.id);
            }
        }

        setLocalOk(ok);
    }, [userId]);

    useEffect(() => {
        const timer = window.setTimeout(persistLocal, LOCAL_DELAY);

        return () => window.clearTimeout(timer);
    }, [docs, offers, persistLocal]);

    // Al cerrar o recargar la pestaña no se espera al debounce.
    useEffect(() => {
        window.addEventListener('pagehide', persistLocal);

        return () => window.removeEventListener('pagehide', persistLocal);
    }, [persistLocal]);

    function recover(offer: DraftOffer) {
        setDocs((previous) => {
            const doc = previous[offer.sceneId];

            // La versión del servidor queda en deshacer: Ctrl+Z vuelve a ella.
            return doc ? { ...previous, [offer.sceneId]: { ...doc, snapshot: offer.draft.snapshot, past: [...doc.past, doc.snapshot], future: [] } } : previous;
        });
        setOffers((previous) => previous.filter((item) => item.sceneId !== offer.sceneId));
        selectScene(offer.sceneId);
        setNotice(__('Draft recovered. Press Save to keep it on the server.'));
    }

    function discard(offer: DraftOffer) {
        if (userId !== null) {
            localDrafts.remove(userId, offer.sceneId);
        }

        setOffers((previous) => previous.filter((item) => item.sceneId !== offer.sceneId));
    }

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

    /** Enter al final de un bloque: crea el siguiente según la convención de guion (entra en deshacer). */
    function enterAfter(block: ScriptBlock) {
        const next: ScriptBlock = { id: crypto.randomUUID(), kind: NEXT_KIND[block.kind], text: '' };

        change((snapshot) => {
            const elements = [...snapshot.elements];
            const index = elements.findIndex((element) => element.id === block.id);
            elements.splice(index < 0 ? elements.length : index + 1, 0, next);

            return { ...snapshot, elements };
        });
        setFocused(next.id);
        requestAnimationFrame(() => document.getElementById(`script-block-${next.id}`)?.focus());
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

    /** @param base "Sobrescribir" tras un 409: se reenvían los tokens de la versión del otro. */
    function save(base?: Pick<ScriptScene, 'updated_at' | 'version_id'>) {
        if (!current || pending) {
            return;
        }

        const { scene, snapshot } = current;

        void run(async () => {
            try {
                const response = await api<{ scene: ScriptScene }>('PUT', `/projects/${project.id}/script/scenes/${scene.id}`, {
                    updated_at: (base ?? scene).updated_at,
                    version_id: (base ?? scene).version_id,
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
                setFailed((previous) => ({ ...previous, [scene.id]: false }));
                setConflict(null);
                setNotice(__('Scene saved.'));
                setError('');
            } catch (caught) {
                // El borrador sigue en el navegador; el indicador muestra el error, nunca "guardado".
                setFailed((previous) => ({ ...previous, [scene.id]: true }));
                setError(errorMessage(caught));

                const payload = caught instanceof ApiError && caught.status === 409 ? (caught.payload.conflict as { scene: ScriptScene; saved_by: string | null } | undefined) : undefined;

                if (payload?.scene) {
                    setConflict({ sceneId: scene.id, theirs: payload.scene, savedBy: payload.saved_by });
                }
            }
        });
    }

    /** "Copiar mi versión": la propia al portapapeles y se carga la guardada; Deshacer recupera la propia. */
    async function copyMine() {
        if (!conflict) {
            return;
        }

        const { sceneId, theirs } = conflict;
        const mine = docs[sceneId]?.snapshot;
        let copied = false;

        try {
            await navigator.clipboard.writeText(plainText(mine?.elements ?? []));
            copied = true;
        } catch {
            // Sin permiso de portapapeles: la versión propia sigue disponible con Deshacer.
        }

        setDocs((previous) => {
            const doc = previous[sceneId];
            const loaded = makeDoc(theirs);

            return { ...previous, [sceneId]: doc ? { ...loaded, past: [...doc.past, doc.snapshot].slice(-HISTORY_LIMIT) } : loaded };
        });
        setFailed((previous) => ({ ...previous, [sceneId]: false }));
        setConflict(null);
        setError('');
        setNotice(
            copied
                ? __('Your version was copied to the clipboard and the saved version is loaded. Undo brings yours back.')
                : __('The saved version is loaded. Your version could not be copied, but Undo brings it back.'),
        );
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
        setCompareWith(null);

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
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
                <h2 className="text-sm font-bold">{__('Structure')}</h2>
                <span className="font-pixel text-sm text-primary" aria-label={choice(':count scene|:count scenes', allDocs.length)}>{String(allDocs.length).padStart(2, '0')}</span>
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
                                className="flex min-h-11 w-full items-center justify-between gap-2 px-4 text-left text-sm font-bold text-foreground"
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
                                                        selected ? 'border-primary bg-surface-3 text-foreground' : 'border-transparent text-muted hover:bg-surface-2 hover:text-foreground'
                                                    }`}
                                                >
                                                    <FileText size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
                                                    <span className="min-w-0 text-sm">
                                                        <span className="mr-1.5 font-pixel text-primary">{codes.get(doc.scene.id)}</span>
                                                        {doc.scene.title}
                                                    </span>
                                                    {isDirty(doc) && <span aria-label={__('Unsaved')} className="mt-2 size-2 shrink-0 rounded-full bg-warning" />}
                                                </button>
                                            );
                                        })}
                                </div>
                            )}
                        </section>
                    );
                })}
                {!allDocs.length && <p className="px-4 text-xs leading-6 text-muted">{__('A new story awaits its first scene.')}</p>}
            </div>
            <div className="border-t border-border p-4">
                <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                        setMobileTree(false);
                        setAdding(true);
                    }}
                    className={`${secondary} w-full border-dashed !px-2 !text-xs`}
                >
                    <Plus size={14} /> {__('Add scene')}
                </button>
                <p className="mt-4 text-xs leading-5 text-subtle">{__('Scenes share characters and locations with your Narrative Bible.')}</p>
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
    // Nombres de los personajes de la escena: una línea en MAYÚSCULAS con su nombre pasa a ser PERSONAJE.
    const sceneNames = current ? characters.filter((character) => current.snapshot.characters.includes(character.id)).map((character) => character.name) : [];
    const versionLabel = (id: number) => {
        const index = versions.findIndex((version) => version.id === id);

        return index === 0 ? __('Most recent') : __('Revision :number', { number: versions.length - index });
    };
    const compareTarget = compareWith === 'current' ? current?.snapshot.elements : versions.find((version) => version.id === compareWith)?.script;

    return (
        <ProjectLayout bare>
            <Head title={`${__('Script')} - ${project.title}`} />
            <div
                className="flex min-h-[calc(100dvh-var(--header-h)-var(--crumb-h))] flex-col bg-background"
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
                        <h1 className="text-2xl font-bold">{__('Script editor')}</h1>
                        <p className="mt-1 text-sm text-muted">{project.title}</p>
                    </div>
                    <div role="status" className={`flex items-center gap-2 text-sm ${currentFailed ? 'text-danger' : currentDirty ? 'text-warning' : 'text-success'}`}>
                        {pending ? (
                            <LoaderCircle size={13} className="animate-spin motion-reduce:animate-none" />
                        ) : currentFailed ? (
                            <CircleAlert size={14} />
                        ) : currentDirty ? (
                            <span aria-hidden="true" className="size-2 rounded-full bg-warning" />
                        ) : (
                            <Cloud size={14} />
                        )}
                        {pending
                            ? __('Processing…')
                            : currentFailed
                              ? localOk
                                  ? __('Not saved: the server failed. Your draft is kept in this browser.')
                                  : __('Not saved: the server failed and this browser cannot keep the draft.')
                              : currentDirty
                                ? localOk
                                    ? __('Unsaved changes, draft kept in this browser')
                                    : __('Unsaved changes, this browser cannot keep the draft')
                                : __('All changes saved')}
                    </div>
                </div>

                <div role="toolbar" aria-label={__('Script tools')} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-y border-border bg-surface px-4 py-3 sm:px-6">
                    <div className="flex flex-wrap gap-1.5">
                        {TOOLS.map(({ kind, label, icon: Icon }) => (
                            <button
                                key={kind}
                                type="button"
                                disabled={!current || pending}
                                title={__('Add :block block', { block: __(label).toLocaleLowerCase() })}
                                onClick={() => insert(kind)}
                                className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:min-h-11 ${
                                    focusedKind === kind ? 'border-primary/50 bg-surface-3 text-foreground' : 'border-border text-muted hover:border-border-strong hover:text-foreground'
                                }`}
                            >
                                <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                                {__(label)}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            type="button"
                            aria-label={__('Undo')}
                            title={__('Undo (Ctrl+Z)')}
                            className={`${secondary} !px-2.5`}
                            disabled={!current?.past.length || pending}
                            onClick={() => undo()}
                        >
                            <Undo2 size={15} />
                        </button>
                        <button
                            type="button"
                            aria-label={__('Redo')}
                            title={__('Redo (Ctrl+Shift+Z)')}
                            className={`${secondary} !px-2.5`}
                            disabled={!current?.future.length || pending}
                            onClick={() => undo(true)}
                        >
                            <Redo2 size={15} />
                        </button>
                        <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
                        <button
                            type="button"
                            disabled={!current || pending}
                            title={__('The analysis uses the saved version of the scene.')}
                            className={secondary}
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
                            className={secondary}
                            onClick={() => focusedBlock && setRefining({ ...focusedBlock })}
                        >
                            <Wand2 size={14} /> {__('Refine with AI')}
                        </button>
                        <button type="button" disabled={!current || pending} className={secondary} onClick={openVersions}>
                            <History size={14} /> {__('Versions')}
                        </button>
                        <button type="button" disabled={!allDocs.length} className={secondary} onClick={exportPdf}>
                            <FileDown size={14} /> {__('Export PDF')}
                        </button>
                        <button type="button" disabled={!current || pending} onClick={() => save()} className={`${primarySm} !min-h-9 !px-3 !py-2 !text-xs`}>
                            <Save size={13} /> {__('Save')}
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2.5 md:hidden">
                    <button type="button" className="flex items-center gap-2 text-xs text-primary" onClick={() => setMobileTree(true)}>
                        <List size={14} /> {__('Scenes')} ({allDocs.length})
                    </button>
                    <button type="button" className="flex items-center gap-2 text-xs text-muted" onClick={() => setMobileContext(true)} disabled={!current}>
                        <PanelRight size={14} /> {__('Context and comments')}
                    </button>
                </div>

                {offers.length > 0 && (
                    <div className="space-y-2 border-b border-border px-5 py-4">
                        {offers.map((offer) => {
                            const doc = docs[offer.sceneId];

                            return (
                                <div key={offer.sceneId} role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-xs">
                                    <span className="min-w-0 flex-1 leading-6">
                                        {__('There is an unsaved draft of :scene from :time in this browser.', {
                                            scene: `${codes.get(offer.sceneId) ?? ''} · ${doc?.scene.title ?? ''}`,
                                            time: new Date(offer.draft.saved_at).toLocaleString(dateLocale),
                                        })}
                                        {offer.conflict && <span className="block text-primary">{__('The scene was saved again after this draft: recovering it and saving will replace those changes.')}</span>}
                                    </span>
                                    <button type="button" className={`${primarySm} !min-h-8 !py-1.5`} onClick={() => recover(offer)}>
                                        {__('Recover draft')}
                                    </button>
                                    <button type="button" className={`${secondary} !min-h-8 !py-1.5`} onClick={() => discard(offer)}>
                                        {__('Discard')}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {lockHolder && current && (
                    <p role="status" className="flex items-center gap-2 border-b border-primary/50 bg-primary/10 px-5 py-2.5 text-xs text-foreground">
                        <UserRound size={14} className="shrink-0" />
                        {__(':name is editing this scene right now. If you both save, whoever saves second will be warned about the conflict.', { name: lockHolder.name })}
                    </p>
                )}

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
                    <aside aria-label={__('Script structure')} className="hidden w-56 shrink-0 border-r border-border bg-surface md:block">
                        {tree}
                    </aside>

                    <div className="flex min-w-0 flex-1 flex-col bg-surface-2">
                        {current ? (
                            <>
                                <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2 text-sm text-muted">
                                    <span className="flex min-w-0 items-center gap-2">
                                        <FileText size={15} aria-hidden="true" className="shrink-0" />
                                        <span className="truncate">
                                            <span className="font-pixel text-primary">{codes.get(current.scene.id)}</span> {current.scene.title}
                                        </span>
                                    </span>
                                    <button type="button" onClick={() => setMobileContext(true)} className="hidden min-h-10 items-center gap-1.5 text-primary md:flex xl:hidden">
                                        <PanelRight size={16} aria-hidden="true" /> {__('Context and comments')}
                                    </button>
                                    <span className="ml-auto">
                                        {__('Script in :language', { language: languageLabel(project.language ?? 'es').toLocaleLowerCase(locale) })}
                                    </span>
                                </div>
                                <div className="flex-1 px-3 py-5 sm:px-6 sm:py-7">
                                    <section
                                        aria-label={__('Script of :scene', { scene: current.scene.title })}
                                        className="mx-auto min-h-[620px] w-full max-w-[740px] rounded-sm border border-paper-rule bg-paper px-8 pb-20 pt-10 font-script text-paper-ink sm:px-10 sm:pt-12 xl:min-h-[720px] xl:px-12"
                                    >
                                        <div className="mb-8 flex items-center justify-between gap-3 border-b border-paper-rule pb-4 text-sm text-paper-muted">
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
                                                        elements: snapshot.elements.map((element) =>
                                                            element.id === block.id
                                                                ? {
                                                                      ...element,
                                                                      text,
                                                                      // Auto-formato: el nombre de un personaje de la escena en MAYÚSCULAS es un bloque PERSONAJE.
                                                                      kind: element.kind === 'action' && matchCharacterLine(text, sceneNames, locale) ? 'character' : element.kind,
                                                                  }
                                                                : element,
                                                        ),
                                                    }))
                                                }
                                                onEnterAtEnd={() => enterAfter(block)}
                                                onRemove={() => change((snapshot) => ({ ...snapshot, elements: snapshot.elements.filter((element) => element.id !== block.id) }))}
                                            />
                                        ))}
                                        {!current.snapshot.elements.length && (
                                            <button type="button" onClick={() => insert('heading')} className="flex w-full flex-col items-center gap-4 py-16 text-center font-sans text-paper-muted">
                                                <Type size={25} aria-hidden="true" />
                                                <span className="text-base">{__('Add a heading to start this scene.')}</span>
                                            </button>
                                        )}
                                    </section>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm text-muted">
                                    <span>
                                        <span className="font-pixel text-foreground">{wordCount}</span> {__('words')}, <span className="font-pixel text-foreground">{current.snapshot.elements.length}</span> {__('blocks')}
                                    </span>
                                    <span>
                                        <kbd className="font-sans">Ctrl</kbd> / <kbd className="font-sans">⌘</kbd> + <kbd className="font-sans">S</kbd> {__('to save')}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="flex min-h-[550px] flex-col items-center justify-center px-8 py-16 text-center">
                                <BookOpen size={38} strokeWidth={1.2} aria-hidden="true" className="text-primary" />
                                <h2 className="mt-6 text-2xl font-bold">{__('The first chapter is yours.')}</h2>
                                <p className="mt-3 max-w-sm text-muted">
                                    {__('Create a scene to start writing. The characters and locations of your Narrative Bible will be one click away.')}
                                </p>
                                <button type="button" className={`${primarySm} mt-7`} onClick={() => setAdding(true)}>
                                    <Plus size={14} /> {__('Add first scene')}
                                </button>
                            </div>
                        )}
                    </div>

                    <aside aria-label={__('Scene context')} className="hidden w-[248px] shrink-0 border-l border-border bg-surface xl:block">
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
                    onUseSuggestion={(text) => {
                        // Una sugerencia es de toda la escena: se propone el bloque enfocado o el primero con texto.
                        const choices = current.snapshot.elements.filter((element) => element.kind !== 'character' && element.text.trim());

                        if (!choices.length) {
                            setError(__('Write a block with text to use this suggestion.'));

                            return;
                        }

                        setRefineFrom({ instruction: text, choices });
                        setRefining({ ...(choices.find((element) => element.id === focused) ?? choices[0]) });
                    }}
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
                    initialInstruction={refineFrom?.instruction}
                    choices={refineFrom?.choices}
                    onClose={() => {
                        setRefining(null);
                        setRefineFrom(null);
                    }}
                    onApply={(text, blockId) => {
                        // Solo el borrador local: entra en deshacer/rehacer y se guarda con Guardar.
                        change((snapshot) => ({
                            ...snapshot,
                            elements: snapshot.elements.map((element) => (element.id === blockId ? { ...element, text } : element)),
                        }));
                        setRefining(null);
                        setRefineFrom(null);
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

            {conflict && docs[conflict.sceneId] && (
                <ConflictDialog
                    theirs={conflict.theirs}
                    savedBy={conflict.savedBy}
                    mine={docs[conflict.sceneId].snapshot.elements}
                    kindLabel={toolLabel}
                    pending={pending}
                    // El diálogo es modal: la escena del conflicto sigue siendo la activa.
                    onOverwrite={() => save(conflict.theirs)}
                    onCopyMine={() => void copyMine()}
                    onClose={() => setConflict(null)}
                />
            )}

            {versionOpen && (
                <Modal
                    title={__('Scene versions')}
                    wide
                    onClose={() => {
                        if (!pending) setVersionOpen(false);
                    }}
                >
                    <p className="mb-5 text-xs leading-6 text-muted">{__('Each save creates a revision. Restoring a version keeps a revision of the current state.')}</p>
                    {pending && (
                        <p role="status" className="flex items-center gap-2 text-xs text-primary">
                            <LoaderCircle size={14} className="animate-spin motion-reduce:animate-none" /> {__('Loading…')}
                        </p>
                    )}
                    <FormError error={versionError} />
                    {!pending && !versions.length && !versionError && <p className="text-xs text-muted">{__('This scene has no revisions yet.')}</p>}
                    {versions.length > 0 && (
                        <div className="grid gap-4 sm:grid-cols-[170px_1fr]">
                            <div className="max-h-72 space-y-2 overflow-y-auto">
                                {versions.map((version, index) => (
                                    <button
                                        key={version.id}
                                        type="button"
                                        disabled={pending}
                                        onClick={() => setPreviewVersion(version.id)}
                                        className={`w-full rounded-md border p-3 text-left ${previewVersion === version.id ? 'border-primary/35 bg-primary/5 text-primary' : 'border-border text-muted'}`}
                                    >
                                        <span className="block text-xs">{index === 0 ? __('Most recent') : __('Revision :number', { number: versions.length - index })}</span>
                                        <span className="mt-1 block text-xs leading-5">
                                            {version.created_at && new Date(version.created_at).toLocaleString(dateLocale)}
                                            {version.author ? ` · ${version.author}` : ''}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            {selectedVersion && (
                                <div>
                                    <label className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                                        <GitCompare size={13} className="text-primary" />
                                        {__('Compare with')}
                                        <select
                                            value={compareWith === null ? '' : String(compareWith)}
                                            onChange={(event) => setCompareWith(event.target.value === '' ? null : event.target.value === 'current' ? 'current' : Number(event.target.value))}
                                            className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                                        >
                                            <option value="">{__('(no comparison: preview)')}</option>
                                            <option value="current">{__('Current draft')}</option>
                                            {versions
                                                .filter((version) => version.id !== selectedVersion.id)
                                                .map((version) => (
                                                    <option key={version.id} value={version.id}>
                                                        {versionLabel(version.id)}
                                                    </option>
                                                ))}
                                        </select>
                                    </label>
                                    {compareTarget ? (
                                        <>
                                            <p className="mb-2 text-xs text-subtle">
                                                {__(':from → :to', {
                                                    from: versionLabel(selectedVersion.id),
                                                    to: compareWith === 'current' ? __('Current draft') : versionLabel(compareWith as number),
                                                })}
                                            </p>
                                            <VersionDiff before={selectedVersion.script} after={compareTarget} kindLabel={toolLabel} />
                                        </>
                                    ) : (
                                        <div className="max-h-72 overflow-y-auto rounded-md border border-border bg-background p-4">
                                            <h3 className="mb-3 text-xs text-primary">{selectedVersion.title}</h3>
                                            {selectedVersion.script.map((element, index) => (
                                                <p key={index} className="mb-3 whitespace-pre-wrap break-words font-script text-sm leading-6 text-muted">
                                                    {element.text}
                                                </p>
                                            ))}
                                        </div>
                                    )}
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
