import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowRight, Check, ChevronRight, Link2, Plus, Save, Search, Settings2, ShieldCheck, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import Modal, { FormError, PageHeading, Pending } from '../../../shared/components/ui';
import useUnsaved from '../../../shared/hooks/useUnsaved';
import { __, choice } from '../../../shared/lib/i18n';
import { button, field, secondary } from '../../../shared/lib/styles';
import type { Project } from '../../projects/projects.types';
import { sceneCodes } from '../../script/script.types';
import {
    MECHANIC_ICONS,
    MECHANIC_KINDS,
    mechanicIcon,
    mechanicKindLabel,
    type CharacterReference,
    type Mechanic,
    type MechanicIcon,
    type MechanicKind,
    type SceneReference,
} from '../mechanics.types';

interface MechanicsProps {
    project: Project;
    mechanics: Mechanic[];
    selected: number | null;
    scenes: SceneReference[];
    characters: CharacterReference[];
}

type Draft = {
    title: string;
    icon: MechanicIcon;
    kind: MechanicKind;
    description: string;
    playable_actions: string;
    restrictions: string;
    conflict: string;
    activation: string;
    narrative_effect: string;
    scene_ids: number[];
    character_ids: number[];
};

type Picker = 'icon' | 'scenes' | 'characters' | null;

function draftOf(mechanic?: Mechanic | null): Draft {
    return {
        title: mechanic?.title ?? '',
        icon: mechanic?.icon ?? 'footsteps',
        kind: mechanic?.kind ?? 'decision',
        description: mechanic?.description ?? '',
        playable_actions: mechanic?.playable_actions ?? '',
        restrictions: mechanic?.restrictions ?? '',
        conflict: mechanic?.conflict ?? '',
        activation: mechanic?.activation ?? '',
        narrative_effect: mechanic?.narrative_effect ?? '',
        scene_ids: [...(mechanic?.scene_ids ?? [])],
        character_ids: [...(mechanic?.character_ids ?? [])],
    };
}

export default function Index({ project, mechanics, selected, scenes, characters }: MechanicsProps) {
    const [selectedId, setSelectedId] = useState<number | null>(selected ?? mechanics[0]?.id ?? null);
    const initial = draftOf(mechanics.find((mechanic) => mechanic.id === selectedId));
    const form = useForm<Draft>(initial);
    const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
    const [query, setQuery] = useState('');
    const [picker, setPicker] = useState<Picker>(null);
    const [saved, setSaved] = useState(false);

    const active = mechanics.find((mechanic) => mechanic.id === selectedId) ?? null;
    const dirty = JSON.stringify(form.data) !== baseline;
    useUnsaved(dirty);

    const codes = sceneCodes(scenes);
    const sceneLabel = (scene: SceneReference) => `${codes.get(scene.id)} · ${scene.title}`;
    const ActiveIcon = mechanicIcon(form.data.icon);
    const needle = query.trim().toLocaleLowerCase();
    const filtered = mechanics.filter((mechanic) => `${mechanic.title} ${mechanic.description ?? ''}`.toLocaleLowerCase().includes(needle));

    /** Carga una mecánica (o un borrador vacío) en el formulario y lo toma como referencia de "sin cambios". */
    const load = (mechanic: Mechanic | null) => {
        const next = draftOf(mechanic);
        setSelectedId(mechanic?.id ?? null);
        form.setData(next);
        form.clearErrors();
        setBaseline(JSON.stringify(next));
        setSaved(false);
    };

    const choose = (mechanic: Mechanic | null) => {
        if (dirty && !confirm(__('Discard the unsaved changes of this mechanic?'))) return;
        load(mechanic);
    };

    const cancel = () => {
        if (dirty && !confirm(__('Discard unsaved changes?'))) return;
        load(active);
    };

    const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
        form.setData((data) => ({ ...data, [key]: value }));
        setSaved(false);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: (page: { props: unknown }) => {
                // El servidor redirige a `?mechanic=<id>`: seleccionamos la mecánica recién guardada.
                const props = page.props as unknown as MechanicsProps;
                const record = props.mechanics.find((mechanic) => mechanic.id === props.selected);
                if (record) {
                    load(record);
                    setSaved(true);
                }
            },
        };

        if (active) {
            form.put(`/projects/${project.id}/mechanics/${active.id}`, options);
        } else {
            form.post(`/projects/${project.id}/mechanics`, options);
        }
    };

    const destroy = () => {
        if (!active || !confirm(__('Delete ":name"?', { name: active.title }))) return;
        router.delete(`/projects/${project.id}/mechanics/${active.id}`, {
            preserveScroll: true,
            onSuccess: (page) => {
                const rest = (page.props as unknown as MechanicsProps).mechanics;
                load(rest[0] ?? null);
            },
        });
    };

    /** Vínculos actuales como { id, label }; label es null si la referencia ya no existe. */
    const linked = (kind: 'scenes' | 'characters') =>
        kind === 'scenes'
            ? form.data.scene_ids.map((id) => {
                  const scene = scenes.find((item) => item.id === id);

                  return { id, label: scene ? sceneLabel(scene) : null };
              })
            : form.data.character_ids.map((id) => ({ id, label: characters.find((character) => character.id === id)?.name ?? null }));

    const toggleLink = (kind: 'scenes' | 'characters', id: number, on: boolean) => {
        const key = kind === 'scenes' ? 'scene_ids' : 'character_ids';
        update(key, on ? [...form.data[key], id] : form.data[key].filter((value) => value !== id));
    };

    const firstError = Object.values(form.errors)[0];

    return (
        <ProjectLayout>
            <Head title={`${__('Game mechanics')} - ${project.title}`} />
            <PageHeading
                eyebrow={__('THE STUDIO / PLAYABLE DESIGN')}
                title={__('Game mechanics')}
                description={__('What the player does. What your story remembers.')}
                action={
                    <span className="flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 font-mono text-[8px] tracking-wider text-primary">
                        <Settings2 size={12} /> {__('SYSTEMS WITH NARRATIVE')}
                    </span>
                }
            />

            <div className="grid items-start gap-5 lg:grid-cols-[225px_minmax(0,1fr)] xl:grid-cols-[245px_minmax(0,1fr)]">
                <aside aria-label={__('Mechanics catalog')} className="overflow-hidden rounded-xl border border-border bg-[#141c15] lg:sticky lg:top-[88px]">
                    <div className="border-b border-border p-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-display text-base">{__('Catalog')}</h2>
                            <span className="font-mono text-[10px] text-[#9cb38c]">{String(mechanics.length).padStart(2, '0')}</span>
                        </div>
                        <label className="mt-4 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2.5">
                            <Search size={14} className="shrink-0 text-[#9aae8e]" />
                            <input
                                aria-label={__('Search mechanics')}
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder={__('Search mechanics…')}
                                className="w-full min-w-0 bg-transparent text-[11px] outline-none"
                            />
                        </label>
                        <button type="button" disabled={form.processing} onClick={() => choose(null)} className={`${secondary} mt-3 w-full justify-between !text-[11px]`}>
                            <span className="flex items-center gap-2">
                                <Plus size={14} />
                                {__('Add mechanic')}
                            </span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                    <div className="max-h-64 space-y-1.5 overflow-y-auto p-2.5 lg:max-h-[calc(100dvh-340px)]">
                        {filtered.map((mechanic) => {
                            const Icon = mechanicIcon(mechanic.icon);
                            const isActive = selectedId === mechanic.id;

                            return (
                                <button
                                    type="button"
                                    key={mechanic.id}
                                    disabled={form.processing}
                                    onClick={() => choose(mechanic)}
                                    aria-pressed={isActive}
                                    className={`flex w-full items-center gap-3 rounded-md border px-3 py-4 text-left transition ${isActive ? 'border-primary/25 bg-primary/10 text-primary' : 'border-transparent text-[#bfceb4] hover:border-border hover:bg-white/[.025]'}`}
                                >
                                    <Icon size={21} strokeWidth={1.5} className="shrink-0" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block break-words text-xs font-medium">{mechanic.title}</span>
                                        <span className="mt-1.5 block text-[9px] text-[#99ad8c]">{choice(':count linked scene|:count linked scenes', mechanic.scene_ids.length)}</span>
                                    </span>
                                    <ChevronRight size={13} className="shrink-0" />
                                </button>
                            );
                        })}
                        {!filtered.length && (
                            <p className="px-3 py-8 text-center text-xs leading-6 text-[#9fb394]">{query ? __('No matches.') : __('Add the first mechanic of your universe.')}</p>
                        )}
                    </div>
                </aside>

                <form className="min-w-0 overflow-hidden rounded-xl border border-border bg-[#161e17]" onSubmit={submit}>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-5 sm:px-7">
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary">
                                <ActiveIcon size={18} strokeWidth={1.5} />
                            </span>
                            <div>
                                <h2 className="font-display text-lg">{active ? __('Edit mechanic') : __('New mechanic')}</h2>
                                <p className="mt-0.5 text-[10px] text-[#9eb292]">{__('Design the experience, connect its meaning.')}</p>
                            </div>
                        </div>
                        <span role="status" className="flex items-center gap-1.5 text-[10px] text-primary">
                            {dirty ? (
                                __('Unsaved changes')
                            ) : saved ? (
                                <>
                                    <Check size={12} /> {__('Saved')}
                                </>
                            ) : (
                                __('Design document')
                            )}
                        </span>
                    </div>

                    <fieldset disabled={form.processing} className="space-y-6 p-5 sm:p-7">
                        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_140px]">
                            <label className="block text-xs">
                                {__('Name')} <span className="text-primary">*</span>
                                <input required maxLength={100} value={form.data.title} onChange={(event) => update('title', event.target.value)} placeholder={__('E.g. Stealth')} className={field} />
                            </label>
                            <div>
                                <span className="block text-xs">
                                    {__('Icon')} <span className="text-primary">*</span>
                                </span>
                                <button
                                    type="button"
                                    aria-label={__('Choose mechanic icon')}
                                    onClick={() => setPicker('icon')}
                                    className="mt-2 flex h-[46px] w-full items-center justify-center gap-4 rounded-md border border-border bg-background text-primary hover:border-primary/50"
                                >
                                    <ActiveIcon size={22} strokeWidth={1.5} />
                                    <Plus size={15} className="rounded-full border border-primary/40 p-0.5" />
                                </button>
                            </div>
                        </div>

                        <label className="block text-xs">
                            {__('Description')} <span className="text-primary">*</span>
                            <textarea
                                required
                                maxLength={2000}
                                rows={3}
                                value={form.data.description}
                                onChange={(event) => update('description', event.target.value)}
                                placeholder={__('How is it played and what does this mechanic add to the experience?')}
                                className={`${field} resize-y leading-7`}
                            />
                        </label>

                        <div className="grid gap-5 xl:grid-cols-2">
                            <label className="block text-xs">
                                {__('Playable actions')}
                                <textarea
                                    maxLength={3000}
                                    rows={5}
                                    value={form.data.playable_actions}
                                    onChange={(event) => update('playable_actions', event.target.value)}
                                    placeholder={['Crouch', 'Hide', 'Press against a wall', 'Distract guards'].map((line) => __(line)).join('\n')}
                                    className={`${field} resize-y !text-xs leading-7`}
                                />
                                <span className="mt-2 block text-[9px] text-[#98ae8a]">{__('One action per line.')}</span>
                            </label>
                            <label className="block text-xs">
                                {__('Restrictions')}
                                <textarea
                                    maxLength={3000}
                                    rows={5}
                                    value={form.data.restrictions}
                                    onChange={(event) => update('restrictions', event.target.value)}
                                    placeholder={['No direct combat', 'Being seen triggers the alarm'].map((line) => __(line)).join('\n')}
                                    className={`${field} resize-y !text-xs leading-7`}
                                />
                            </label>
                        </div>

                        <section className="rounded-lg border border-[#3a4a33] bg-background/40 p-4 sm:p-5">
                            <h3 className="mb-5 flex items-center gap-2 text-xs font-medium text-[#dce6d5]">
                                <Link2 size={15} className="text-primary" /> {__('Narrative links')}
                            </h3>
                            <div className="space-y-5">
                                {(['scenes', 'characters'] as const).map((kind) => (
                                    <div key={kind} className="grid items-start gap-3 sm:grid-cols-[85px_minmax(0,1fr)]">
                                        <h4 className="pt-2 text-[11px] text-[#b9cbb0]">{kind === 'scenes' ? __('Scenes') : __('Characters')}</h4>
                                        <div className="flex min-w-0 flex-wrap gap-2">
                                            {linked(kind).map(({ id, label }) => {
                                                const text = label ?? __('Reference unavailable');

                                                return (
                                                    <span key={id} className="inline-flex max-w-full items-center gap-2 rounded-md border border-primary/20 bg-primary/[.07] px-2.5 py-2 text-[10px] text-[#c5d9b7]">
                                                        <span className="min-w-0 break-words">{text}</span>
                                                        <button type="button" aria-label={__('Unlink :name', { name: text })} onClick={() => toggleLink(kind, id, false)} className="shrink-0 text-[#9cb78b] hover:text-primary">
                                                            <X size={12} />
                                                        </button>
                                                    </span>
                                                );
                                            })}
                                            <button type="button" onClick={() => setPicker(kind)} className={`${secondary} !min-h-8 border-dashed !px-2.5 !py-1.5 !text-[10px]`}>
                                                <Plus size={12} /> {kind === 'scenes' ? __('Link scene') : __('Link character')}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <label className="grid items-center gap-3 sm:grid-cols-[85px_minmax(0,1fr)]">
                                    <span className="text-[11px] text-[#b9cbb0]">{__('Conflict')}</span>
                                    <input
                                        aria-label={__('Narrative conflict')}
                                        maxLength={500}
                                        value={form.data.conflict}
                                        onChange={(event) => update('conflict', event.target.value)}
                                        className={`${field} !mt-0 !text-xs`}
                                        placeholder={project.central_conflict || __('What narrative tension does it put into play?')}
                                    />
                                </label>
                                {!form.data.conflict && project.central_conflict && (
                                    <button type="button" className="text-[10px] text-primary sm:ml-[97px]" onClick={() => update('conflict', project.central_conflict ?? '')}>
                                        {__('Use the project conflict')} <ArrowRight size={11} className="ml-1 inline" />
                                    </button>
                                )}
                            </div>
                        </section>

                        <details className="rounded-lg border border-border px-4 py-3">
                            <summary className="cursor-pointer text-[11px] text-[#aabd9e]">{__('More mechanic details')}</summary>
                            <div className="mt-5 space-y-4">
                                <label className="block text-xs">
                                    {__('Type')}
                                    <select value={form.data.kind} onChange={(event) => update('kind', event.target.value as MechanicKind)} className={field}>
                                        {MECHANIC_KINDS.map((kind) => (
                                            <option key={kind} value={kind}>
                                                {mechanicKindLabel(kind)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="block text-xs">
                                    {__('Activation')}
                                    <input maxLength={300} value={form.data.activation} onChange={(event) => update('activation', event.target.value)} placeholder={__('Which player action triggers it?')} className={field} />
                                </label>
                                <label className="block text-xs">
                                    {__('Narrative consequence')}
                                    <textarea rows={3} maxLength={1000} value={form.data.narrative_effect} onChange={(event) => update('narrative_effect', event.target.value)} className={field} />
                                </label>
                            </div>
                        </details>

                        <FormError error={firstError} />

                        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
                            <p className="flex items-center gap-2 text-[9px] text-[#99b18c]">
                                <ShieldCheck size={13} /> {__('Your links are saved with the mechanic.')}
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {active && (
                                    <button type="button" onClick={destroy} className={`${secondary} hover:!border-rose-300/40 hover:!text-rose-300`}>
                                        <Trash2 size={14} />
                                        {__('Delete')}
                                    </button>
                                )}
                                <button type="button" onClick={cancel} className={secondary}>
                                    {__('Cancel')}
                                </button>
                                <button type="submit" className={button}>
                                    <Pending pending={form.processing}>
                                        <Save size={14} />
                                        {__('Save mechanic')}
                                    </Pending>
                                </button>
                            </div>
                        </div>
                    </fieldset>
                </form>
            </div>

            {picker && (
                <Modal title={picker === 'icon' ? __('Choose icon') : picker === 'scenes' ? __('Link scenes') : __('Link characters')} onClose={() => setPicker(null)}>
                    {picker === 'icon' ? (
                        <div className="grid grid-cols-2 gap-3">
                            {MECHANIC_ICONS.map(({ value, label, icon: Icon }) => (
                                <button
                                    type="button"
                                    key={value}
                                    aria-pressed={form.data.icon === value}
                                    onClick={() => {
                                        update('icon', value);
                                        setPicker(null);
                                    }}
                                    className={`flex flex-col items-center gap-3 rounded-lg border p-5 text-xs ${form.data.icon === value ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-[#baccae] hover:border-primary/30'}`}
                                >
                                    <Icon size={25} strokeWidth={1.5} />
                                    {__(label)}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <LinkPicker
                            projectId={project.id}
                            kind={picker}
                            options={picker === 'scenes' ? scenes.map((scene) => ({ id: scene.id, label: sceneLabel(scene) })) : characters.map((character) => ({ id: character.id, label: character.name }))}
                            checked={picker === 'scenes' ? form.data.scene_ids : form.data.character_ids}
                            onToggle={(id, on) => toggleLink(picker, id, on)}
                            onDone={() => setPicker(null)}
                        />
                    )}
                </Modal>
            )}
        </ProjectLayout>
    );
}

function LinkPicker({
    projectId,
    kind,
    options,
    checked,
    onToggle,
    onDone,
}: {
    projectId: number;
    kind: 'scenes' | 'characters';
    options: { id: number; label: string }[];
    checked: number[];
    onToggle: (id: number, on: boolean) => void;
    onDone: () => void;
}) {
    return (
        <>
            <div className="space-y-2">
                {options.map((option) => (
                    <label key={option.id} className="flex items-start gap-3 rounded-md border border-border p-3 text-xs leading-6">
                        <input type="checkbox" checked={checked.includes(option.id)} onChange={(event) => onToggle(option.id, event.target.checked)} className="mt-1.5 accent-[#c2e88d]" />
                        <span>{option.label}</span>
                    </label>
                ))}
            </div>
            {!options.length && (
                <p className="text-xs leading-7 text-[#b0c39f]">
                    {kind === 'scenes' ? __('There are no scenes in this project yet.') : __('There are no characters in this project yet.')} {__('You can create them in')}{' '}
                    <Link className="text-primary underline" href={`/projects/${projectId}/${kind}`}>
                        {kind === 'scenes' ? __('Scenes') : __('Characters')}
                    </Link>
                    .
                </p>
            )}
            <button type="button" onClick={onDone} className={`${button} mt-6 w-full`}>
                <Check size={14} />
                {__('Done')}
            </button>
            <p className="mt-3 text-[10px] leading-6 text-[#9ab18c]">{__('Press Save mechanic to keep the links.')}</p>
        </>
    );
}
