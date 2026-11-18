import { Head } from '@inertiajs/react';
import { Link2, UserRound, Wand2 } from 'lucide-react';
import { useState } from 'react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import LinkPicker from '../../../shared/components/LinkPicker';
import Modal, { FormError, PageHeading } from '../../../shared/components/ui';
import { __, choice } from '../../../shared/lib/i18n';
import { field, secondary } from '../../../shared/lib/styles';
import FeedbackButtons from '../../analysis/components/FeedbackButtons';
import BibleTabs from '../../bible/components/BibleTabs';
import EntryCatalog, { type CatalogItem } from '../../bible/components/EntryCatalog';
import { CreateIn, EntryFooter, EntryStatus } from '../../bible/components/EntryParts';
import ImageField from '../../bible/components/ImageField';
import LinkRow from '../../bible/components/LinkRow';
import useEntryEditor from '../../bible/hooks/useEntryEditor';
import type { EmotionCatalog } from '../../analysis/emotion.types';
import type { Project } from '../../projects/projects.types';
import { sceneCodes } from '../../script/script.types';
import { ROLE_SUGGESTIONS, type CharacterSheet } from '../characters.types';
import CharacterDraftDialog, { type CharacterDraftResult } from '../components/CharacterDraftDialog';
import InitialEmotionField from '../components/InitialEmotionField';

interface CharactersProps {
    project: Project;
    entries: CharacterSheet[];
    selected: number | null;
    startNew: boolean;
    scenes: { id: number; title: string; order: number }[];
    emotionCatalog: EmotionCatalog;
}

type Draft = {
    name: string;
    role: string;
    age: string;
    background: string;
    personality: string;
    motivation: string;
    values: string;
    inner_conflict: string;
    speech_style: string;
    limits: string;
    archetype: string;
    gender: string;
    fear: string;
    desire: string;
    emotional_arc: string;
    visual_description: string;
    voice_notes: string;
    initial_emotion: string;
    initial_intensity: string;
    image: File | null;
    remove_image: boolean;
    scene_ids: number[];
    /** La ficha siempre sincroniza las escenas (con multipart una lista vacía no se envía). */
    sync_scenes: boolean;
};

/** Campos secundarios, en "Más detalles": [clave del borrador, etiqueta]. */
const DETAILS: [keyof Draft, string][] = [
    ['fear', 'Fear'],
    ['desire', 'Desire'],
    ['emotional_arc', 'Emotional arc'],
    ['visual_description', 'Visual description'],
    ['voice_notes', 'Voice notes'],
];

function draftOf(entry: CharacterSheet | null): Draft {
    return {
        name: entry?.name ?? '',
        role: entry?.role ?? '',
        age: entry?.age?.toString() ?? '',
        background: entry?.background ?? '',
        personality: entry?.personality ?? '',
        motivation: entry?.motivation ?? '',
        values: entry?.values ?? '',
        inner_conflict: entry?.inner_conflict ?? '',
        speech_style: entry?.speech_style ?? '',
        limits: entry?.limits ?? '',
        archetype: entry?.archetype ?? '',
        gender: entry?.gender ?? '',
        fear: entry?.fear ?? '',
        desire: entry?.desire ?? '',
        emotional_arc: entry?.emotional_arc ?? '',
        visual_description: entry?.visual_description ?? '',
        voice_notes: entry?.voice_notes ?? '',
        initial_emotion: entry?.initial_emotion ?? '',
        initial_intensity: entry?.initial_intensity ?? '',
        image: null,
        remove_image: false,
        scene_ids: [...(entry?.scene_ids ?? [])],
        sync_scenes: true,
    };
}

export default function Index({ project, entries, selected, startNew, scenes, emotionCatalog }: CharactersProps) {
    const { form, active, selectedId, dirty, saved, choose, cancel, update, submit, destroy, fillNew } = useEntryEditor<CharacterSheet, Draft>({
        url: `/projects/${project.id}/characters`,
        entries,
        selected,
        startNew,
        draftOf,
        nameOf: (entry) => entry.name,
    });
    const [query, setQuery] = useState('');
    const [picking, setPicking] = useState(false);
    const [drafting, setDrafting] = useState(false);
    // Borrador de la IA cargado en una ficha nueva (aún sin guardar).
    const [aiDraft, setAiDraft] = useState<{ generationId: number | null; duplicate: boolean } | null>(null);

    function applyDraft({ draft, duplicate_name, generation_id }: CharacterDraftResult) {
        const text = (value: string | null | undefined) => value ?? '';
        const filled = fillNew({
            name: text(draft.name),
            role: text(draft.role),
            age: draft.age?.toString() ?? '',
            background: text(draft.background),
            personality: text(draft.personality),
            motivation: text(draft.motivation),
            values: text(draft.values),
            inner_conflict: text(draft.inner_conflict),
            speech_style: text(draft.speech_style),
            limits: text(draft.limits),
            archetype: text(draft.archetype),
            gender: text(draft.gender),
            fear: text(draft.fear),
            desire: text(draft.desire),
            emotional_arc: text(draft.emotional_arc),
            visual_description: text(draft.visual_description),
            voice_notes: text(draft.voice_notes),
            initial_emotion: text(draft.initial_emotion),
            initial_intensity: text(draft.initial_intensity),
        });

        if (filled) {
            setAiDraft({ generationId: generation_id, duplicate: duplicate_name });
            setDrafting(false);
        }
    }

    const codes = sceneCodes(scenes);
    const sceneLabel = (id: number) => {
        const scene = scenes.find((item) => item.id === id);

        return scene ? `${codes.get(scene.id)} · ${scene.title}` : null;
    };

    const needle = query.trim().toLocaleLowerCase();
    const items: CatalogItem[] = entries
        .filter((entry) => `${entry.name} ${entry.role ?? ''}`.toLocaleLowerCase().includes(needle))
        .map((entry) => ({
            id: entry.id,
            title: entry.name,
            icon: UserRound,
            subtitle: [entry.role, choice(':count scene|:count scenes', entry.scene_ids.length)].filter(Boolean).join(' · '),
        }));

    const toggleScene = (id: number, on: boolean) => update('scene_ids', on ? [...form.data.scene_ids, id] : form.data.scene_ids.filter((value) => value !== id));

    const text = (key: keyof Draft, label: string, placeholder?: string, rows = 3) => (
        <label className="block text-xs">
            {label}
            <textarea
                rows={rows}
                maxLength={5000}
                value={form.data[key] as string}
                onChange={(event) => update(key, event.target.value as never)}
                placeholder={placeholder}
                className={`${field} resize-y leading-7`}
            />
        </label>
    );

    const firstError = Object.values(form.errors)[0] as string | undefined;

    return (
        <ProjectLayout>
            <Head title={`${__('Characters')} - ${project.title}`} />
            <PageHeading
                title={__('Narrative Bible')}
                description={__('Who lives in your world: what they want, how they speak and where they appear.')}
                action={
                    <button type="button" className={secondary} onClick={() => setDrafting(true)} disabled={form.processing}>
                        <Wand2 size={14} /> {__('Draft with AI')}
                    </button>
                }
            />
            <BibleTabs projectId={project.id} active="characters" />

            <div className="grid items-start gap-5 lg:grid-cols-[225px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)]">
                <EntryCatalog
                    label={__('Characters')}
                    count={entries.length}
                    query={query}
                    onQuery={setQuery}
                    searchLabel={__('Search characters')}
                    addLabel={__('New character')}
                    onAdd={() => {
                        setAiDraft(null);
                        choose(null);
                    }}
                    items={items}
                    selectedId={selectedId}
                    onSelect={(id) => {
                        setAiDraft(null);
                        choose(entries.find((entry) => entry.id === id) ?? null);
                    }}
                    disabled={form.processing}
                    empty={__('Add the first character of your world.')}
                />

                <form className="min-w-0 overflow-hidden rounded-xl border border-border bg-[#161e17]" onSubmit={submit}>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-5 sm:px-7">
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary">
                                <UserRound size={18} strokeWidth={1.5} />
                            </span>
                            <div>
                                <h2 className="font-display text-lg">{active ? __('Character sheet: :name', { name: active.name }) : __('New character')}</h2>
                                <p className="mt-0.5 text-[10px] text-[#9eb292]">{__('Give them a face, a goal and a voice.')}</p>
                            </div>
                        </div>
                        <EntryStatus dirty={dirty} saved={saved} />
                    </div>

                    {aiDraft && !active && (
                        <div role="status" className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/20 bg-primary/5 px-5 py-3 text-[11px] leading-5 sm:px-7">
                            <span className="flex items-start gap-2 text-[#d3dfca]">
                                <Wand2 size={14} className="mt-0.5 shrink-0 text-primary" />
                                <span>
                                    {__('AI draft: review it and press Save sheet. Nothing is saved until you do.')}
                                    {aiDraft.duplicate && <span className="block text-[#f1d79a]">{__('A character with this name already exists: change it before saving.')}</span>}
                                </span>
                            </span>
                            {aiDraft.generationId && <FeedbackButtons key={aiDraft.generationId} projectId={project.id} target={{ ai_generation_id: aiDraft.generationId }} />}
                        </div>
                    )}

                    <fieldset disabled={form.processing} className="space-y-6 p-5 sm:p-7">
                        <div className="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
                            <ImageField
                                file={form.data.image}
                                currentUrl={active?.image_url ?? null}
                                removed={form.data.remove_image}
                                alt={__('Concept art of :name', { name: form.data.name || __('the character') })}
                                onPick={(file) => {
                                    form.clearErrors('image');
                                    update('image', file);
                                    update('remove_image', false);
                                }}
                                onRemove={() => {
                                    update('image', null);
                                    update('remove_image', Boolean(active?.image_url));
                                }}
                                onTooLarge={() => form.setError('image', __('The image must not exceed 5 MB.'))}
                            />

                            <div className="grid content-start gap-5 sm:grid-cols-2 xl:grid-cols-4">
                                <label className="block text-xs sm:col-span-2">
                                    {__('Name')} <span className="text-primary">*</span>
                                    <input required maxLength={255} value={form.data.name} onChange={(event) => update('name', event.target.value)} placeholder={__('E.g. Lía')} className={field} />
                                </label>
                                <label className="block text-xs">
                                    {__('Role')}
                                    <input list="character-roles" maxLength={255} value={form.data.role} onChange={(event) => update('role', event.target.value)} className={field} />
                                    <datalist id="character-roles">
                                        {ROLE_SUGGESTIONS.map((role) => (
                                            <option key={role} value={__(role)} />
                                        ))}
                                    </datalist>
                                </label>
                                <label className="block text-xs">
                                    {__('Age')}
                                    <input type="number" min={0} max={200} value={form.data.age} onChange={(event) => update('age', event.target.value)} className={field} />
                                </label>
                                <div className="sm:col-span-2">{text('background', __('Background'), __('Where do they come from, what marked them?'))}</div>
                                <div className="sm:col-span-2">{text('personality', __('Personality'), __('E.g. Cautious, persevering, loving'))}</div>
                                <div className="sm:col-span-2">{text('motivation', __('Goal'), __('What do they want to achieve?'))}</div>
                                <div className="sm:col-span-2">{text('values', __('Values'), __('What do they believe in? What would they defend?'))}</div>
                                <div className="sm:col-span-2">{text('inner_conflict', __('Inner conflict'), __('What two things they want or believe pull them apart?'))}</div>
                                <div className="sm:col-span-2">{text('speech_style', __('Voice'), __('How do they speak? E.g. Short, direct sentences.'))}</div>
                            </div>
                        </div>

                        {text('limits', __('Limits and exceptions'), __('What would they never do, and when would they do it anyway?'), 2)}

                        <InitialEmotionField
                            catalog={emotionCatalog}
                            emotion={form.data.initial_emotion}
                            intensity={form.data.initial_intensity}
                            onChange={(emotion, intensity) => {
                                update('initial_emotion', emotion);
                                update('initial_intensity', intensity);
                            }}
                        />

                        <section className="rounded-lg border border-[#3a4a33] bg-background/40 p-4 sm:p-5">
                            <h3 className="mb-5 flex items-center gap-2 text-xs font-medium text-[#dce6d5]">
                                <Link2 size={15} className="text-primary" /> {__('Narrative links')}
                            </h3>
                            <LinkRow
                                label={__('Scenes')}
                                note={__('The same cast you see in the script.')}
                                items={form.data.scene_ids.map((id) => ({ id, label: sceneLabel(id) }))}
                                onRemove={(id) => toggleScene(id, false)}
                                addLabel={__('Link scene')}
                                onAdd={() => setPicking(true)}
                            />
                        </section>

                        <details className="rounded-lg border border-border px-4 py-3">
                            <summary className="cursor-pointer text-[11px] text-[#aabd9e]">{__('More character details')}</summary>
                            <div className="mt-5 grid gap-5 sm:grid-cols-2">
                                <label className="block text-xs">
                                    {__('Archetype')}
                                    <input maxLength={255} value={form.data.archetype} onChange={(event) => update('archetype', event.target.value)} className={field} />
                                </label>
                                <label className="block text-xs">
                                    {__('Gender')}
                                    <input maxLength={255} value={form.data.gender} onChange={(event) => update('gender', event.target.value)} className={field} />
                                </label>
                                {DETAILS.map(([key, label]) => (
                                    <div key={key}>{text(key, __(label))}</div>
                                ))}
                            </div>
                        </details>

                        <FormError error={firstError} />

                        <EntryFooter
                            note={active ? choice('Appears in :count scene|Appears in :count scenes', active.scene_ids.length) : __('Your links are saved with the character.')}
                            canDelete={Boolean(active)}
                            onDelete={destroy}
                            onCancel={cancel}
                            processing={form.processing}
                            saveLabel={__('Save sheet')}
                        />
                    </fieldset>
                </form>
            </div>

            {drafting && <CharacterDraftDialog projectId={project.id} onDraft={applyDraft} onClose={() => setDrafting(false)} />}

            {picking && (
                <Modal title={__('Link scenes')} onClose={() => setPicking(false)}>
                    <LinkPicker
                        options={scenes.map((scene) => ({ id: scene.id, label: sceneLabel(scene.id) ?? scene.title }))}
                        checked={form.data.scene_ids}
                        onToggle={toggleScene}
                        onDone={() => setPicking(false)}
                        empty={<CreateIn text={__('There are no scenes in this project yet.')} href={`/projects/${project.id}/scenes`} section={__('Scenes')} />}
                        note={__('Press Save sheet to keep the links.')}
                    />
                </Modal>
            )}
        </ProjectLayout>
    );
}
