import { Head } from '@inertiajs/react';
import { Link2 } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import LinkPicker, { type LinkOption } from '../../../shared/components/LinkPicker';
import Modal, { FormError, PageHeading } from '../../../shared/components/ui';
import { __, choice } from '../../../shared/lib/i18n';
import { field } from '../../../shared/lib/styles';
import { loreTypeLabel } from '../../lore/loreOptions';
import { sceneCodes } from '../../script/script.types';
import { LOCATION_TYPES, locationTypeIcon, locationTypeLabel, type BibleEntry, type BibleEntryPageProps, type CharacterRole } from '../bible.types';
import BibleTabs from '../components/BibleTabs';
import EntryCatalog, { type CatalogItem } from '../components/EntryCatalog';
import { CreateIn, EntryFooter, EntryStatus } from '../components/EntryParts';
import LinkRow from '../components/LinkRow';
import useEntryEditor from '../hooks/useEntryEditor';

type Draft = {
    title: string;
    subtype: string;
    parent_id: number | null;
    emotional_tone: string;
    description: string;
    narrative_function: string;
    access: string;
    scene_ids: number[];
    characters: { id: number; role: CharacterRole | null }[];
    rule_ids: number[];
    lore_ids: number[];
};

type Picker = 'scenes' | 'characters' | 'rules' | 'lore' | null;

function draftOf(entry: BibleEntry | null): Draft {
    return {
        title: entry?.title ?? '',
        subtype: entry?.subtype ?? '',
        parent_id: entry?.parent_id ?? null,
        emotional_tone: entry?.emotional_tone ?? '',
        description: entry?.description ?? '',
        narrative_function: entry?.narrative_function ?? '',
        access: entry?.access ?? '',
        scene_ids: [...(entry?.scene_ids ?? [])],
        characters: (entry?.characters ?? []).map(({ id }) => ({ id, role: null })),
        rule_ids: [...(entry?.rule_ids ?? [])],
        lore_ids: [...(entry?.lore_ids ?? [])],
    };
}

/** Ordena los lugares como árbol (padre seguido de sus hijos) con su profundidad. */
function asTree(entries: BibleEntry[]) {
    const ids = new Set(entries.map((entry) => entry.id));
    const children = new Map<number | null, BibleEntry[]>();
    for (const entry of entries) {
        const parent = entry.parent_id && ids.has(entry.parent_id) ? entry.parent_id : null;
        children.set(parent, [...(children.get(parent) ?? []), entry]);
    }

    const ordered: { entry: BibleEntry; depth: number }[] = [];
    const visited = new Set<number>();
    const walk = (parent: number | null, depth: number) => {
        for (const entry of children.get(parent) ?? []) {
            if (visited.has(entry.id)) continue;
            visited.add(entry.id);
            ordered.push({ entry, depth });
            walk(entry.id, depth + 1);
        }
    };
    walk(null, 0);
    // Restos de un ciclo (no debería ocurrir: el servidor lo impide).
    entries.filter((entry) => !visited.has(entry.id)).forEach((entry) => ordered.push({ entry, depth: 0 }));

    return { ordered, children };
}

export default function Locations({ project, entries, selected, scenes, characters, lore }: BibleEntryPageProps) {
    const { form, active, selectedId, dirty, saved, choose, cancel, update, submit, destroy } = useEntryEditor<BibleEntry, Draft>({
        url: `/projects/${project.id}/bible/locations`,
        entries,
        selected,
        draftOf,
        nameOf: (entry) => entry.title,
    });
    const [query, setQuery] = useState('');
    const [picker, setPicker] = useState<Picker>(null);

    const codes = sceneCodes(scenes);
    const sceneLabel = (id: number) => {
        const scene = scenes.find((item) => item.id === id);

        return scene ? `${codes.get(scene.id)} · ${scene.title}` : null;
    };
    const placeName = (id: number) => entries.find((entry) => entry.id === id)?.title ?? lore.find((entry) => entry.id === id)?.title ?? null;
    const rules = lore.filter((entry) => entry.type === 'rule');
    const otherLore = lore.filter((entry) => entry.type !== 'rule' && entry.type !== 'location');

    const { ordered, children } = useMemo(() => asTree(entries), [entries]);
    const needle = query.trim().toLocaleLowerCase();
    const items: CatalogItem[] = ordered
        .filter(({ entry }) => `${entry.title} ${entry.description ?? ''}`.toLocaleLowerCase().includes(needle))
        .map(({ entry, depth }) => ({
            id: entry.id,
            title: entry.title,
            icon: locationTypeIcon(entry.subtype),
            depth: needle ? 0 : Math.min(depth, 3),
            subtitle: [locationTypeLabel(entry.subtype), choice(':count scene|:count scenes', entry.scene_ids.length)].filter(Boolean).join(' · '),
        }));

    // Un lugar no puede estar dentro de sí mismo ni de uno de sus descendientes.
    const blocked = new Set<number>();
    const block = (id: number) => {
        if (blocked.has(id)) return;
        blocked.add(id);
        (children.get(id) ?? []).forEach((child) => block(child.id));
    };
    if (active) block(active.id);


    const idsOf = (kind: Exclude<Picker, null>) =>
        kind === 'characters' ? form.data.characters.map(({ id }) => id) : form.data[kind === 'scenes' ? 'scene_ids' : kind === 'rules' ? 'rule_ids' : 'lore_ids'];

    const toggle = (kind: Exclude<Picker, null>, id: number, on: boolean) => {
        if (kind === 'characters') {
            update('characters', on ? [...form.data.characters, { id, role: null }] : form.data.characters.filter((link) => link.id !== id));

            return;
        }
        const key = kind === 'scenes' ? 'scene_ids' : kind === 'rules' ? 'rule_ids' : 'lore_ids';
        update(key, on ? [...form.data[key], id] : form.data[key].filter((value) => value !== id));
    };

    const pickers: Record<Exclude<Picker, null>, { title: string; options: LinkOption[]; empty: ReactNode }> = {
        scenes: {
            title: __('Link scenes'),
            options: scenes.map((scene) => ({
                id: scene.id,
                label: sceneLabel(scene.id) ?? scene.title,
                hint:
                    scene.location_id && scene.location_id !== active?.id && !form.data.scene_ids.includes(scene.id)
                        ? __('Now in: :place. It will move here.', { place: placeName(scene.location_id) ?? '?' })
                        : null,
            })),
            empty: <CreateIn text={__('There are no scenes in this project yet.')} href={`/projects/${project.id}/scenes`} section={__('Scenes')} />,
        },
        characters: {
            title: __('Link characters'),
            options: characters.map((character) => ({ id: character.id, label: character.name })),
            empty: <CreateIn text={__('There are no characters in this project yet.')} href={`/projects/${project.id}/characters`} section={__('Characters')} />,
        },
        rules: {
            title: __('Link world rules'),
            options: rules.map((rule) => ({ id: rule.id, label: rule.title })),
            empty: <CreateIn text={__('There are no world rules yet.')} href={`/projects/${project.id}/bible/rules`} section={__('World rules')} />,
        },
        lore: {
            title: __('Link lore'),
            options: otherLore.map((entry) => ({ id: entry.id, label: `${loreTypeLabel(entry.type)} · ${entry.title}` })),
            empty: <CreateIn text={__('There are no other lore entries yet.')} href={`/projects/${project.id}/lore/create`} section={__('Lore')} />,
        },
    };

    const firstError = Object.values(form.errors)[0] as string | undefined;
    const TypeIcon = locationTypeIcon(form.data.subtype);

    return (
        <ProjectLayout>
            <Head title={`${__('Places')} - ${project.title}`} />
            <PageHeading title={__('Narrative Bible')} description={__('The places of your world: what they look like, what they mean and what happens in them.')} />
            <BibleTabs projectId={project.id} active="locations" />

            <div className="grid items-start gap-5 lg:grid-cols-[225px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)]">
                <EntryCatalog
                    label={__('Places')}
                    count={entries.length}
                    query={query}
                    onQuery={setQuery}
                    searchLabel={__('Search places')}
                    addLabel={__('New place')}
                    onAdd={() => choose(null)}
                    items={items}
                    selectedId={selectedId}
                    onSelect={(id) => choose(entries.find((entry) => entry.id === id) ?? null)}
                    disabled={form.processing}
                    empty={__('Add the first place of your world.')}
                    footnote={entries.some((entry) => entry.parent_id) ? __('Indented places are inside another place.') : undefined}
                />

                <form className="min-w-0 overflow-hidden rounded-xl border border-border bg-[#161e17]" onSubmit={submit}>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-5 sm:px-7">
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary">
                                <TypeIcon size={18} strokeWidth={1.5} />
                            </span>
                            <div>
                                <h2 className="font-display text-lg">{active ? __('Place sheet: :name', { name: active.title }) : __('New place')}</h2>
                                <p className="mt-0.5 text-[10px] text-[#9eb292]">{__('Describe it, give it a purpose and connect it to your story.')}</p>
                            </div>
                        </div>
                        <EntryStatus dirty={dirty} saved={saved} />
                    </div>

                    <fieldset disabled={form.processing} className="space-y-6 p-5 sm:p-7">
                        <div>
                            <div className="grid content-start gap-5 sm:grid-cols-2 xl:grid-cols-4">
                                <label className="block text-xs sm:col-span-2">
                                    {__('Name')} <span className="text-primary">*</span>
                                    <input required maxLength={120} value={form.data.title} onChange={(event) => update('title', event.target.value)} placeholder={__('E.g. Ember Shelter')} className={field} />
                                </label>
                                <label className="block text-xs">
                                    {__('Type')}
                                    <select value={form.data.subtype} onChange={(event) => update('subtype', event.target.value)} className={field}>
                                        <option value="">{__('No type')}</option>
                                        {LOCATION_TYPES.map(({ value, label }) => (
                                            <option key={value} value={value}>
                                                {__(label)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="block text-xs">
                                    {__('Inside')}
                                    <select value={form.data.parent_id ?? ''} onChange={(event) => update('parent_id', event.target.value ? Number(event.target.value) : null)} className={field}>
                                        <option value="">{__('— None —')}</option>
                                        {ordered
                                            .filter(({ entry }) => !blocked.has(entry.id))
                                            .map(({ entry, depth }) => (
                                                <option key={entry.id} value={entry.id}>
                                                    {`${'· '.repeat(Math.min(depth, 3))}${entry.title}`}
                                                </option>
                                            ))}
                                    </select>
                                </label>
                                <label className="block text-xs sm:col-span-2 xl:col-span-4">
                                    {__('Atmosphere')}
                                    <input maxLength={255} value={form.data.emotional_tone} onChange={(event) => update('emotional_tone', event.target.value)} placeholder={__('E.g. Tense calm')} className={field} />
                                </label>
                                <label className="block text-xs sm:col-span-2 xl:col-span-4">
                                    {__('Sensory description')}
                                    <textarea
                                        rows={4}
                                        maxLength={3000}
                                        value={form.data.description}
                                        onChange={(event) => update('description', event.target.value)}
                                        placeholder={__('What can be seen, heard and smelled here?')}
                                        className={`${field} resize-y leading-7`}
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="grid gap-5 xl:grid-cols-2">
                            <label className="block text-xs">
                                {__('Narrative function')} <span className="text-primary">*</span>
                                <textarea
                                    required
                                    rows={4}
                                    maxLength={2000}
                                    value={form.data.narrative_function}
                                    onChange={(event) => update('narrative_function', event.target.value)}
                                    placeholder={__('What does this place mean for the story or for the player?')}
                                    className={`${field} resize-y leading-7`}
                                />
                            </label>
                            <label className="block text-xs">
                                {__('Access and dangers')}
                                <textarea
                                    rows={4}
                                    maxLength={2000}
                                    value={form.data.access}
                                    onChange={(event) => update('access', event.target.value)}
                                    placeholder={__('How do you get in, who guards it, what can go wrong?')}
                                    className={`${field} resize-y leading-7`}
                                />
                            </label>
                        </div>

                        <section className="rounded-lg border border-[#3a4a33] bg-background/40 p-4 sm:p-5">
                            <h3 className="mb-5 flex items-center gap-2 text-xs font-medium text-[#dce6d5]">
                                <Link2 size={15} className="text-primary" /> {__('Narrative links')}
                            </h3>
                            <div className="space-y-5">
                                <LinkRow
                                    label={__('Scenes')}
                                    note={__('This place becomes their location.')}
                                    items={form.data.scene_ids.map((id) => ({ id, label: sceneLabel(id) }))}
                                    onRemove={(id) => toggle('scenes', id, false)}
                                    addLabel={__('Link scene')}
                                    onAdd={() => setPicker('scenes')}
                                />
                                <LinkRow
                                    label={__('Usual characters')}
                                    items={form.data.characters.map(({ id }) => ({ id, label: characters.find((character) => character.id === id)?.name ?? null }))}
                                    onRemove={(id) => toggle('characters', id, false)}
                                    addLabel={__('Link character')}
                                    onAdd={() => setPicker('characters')}
                                />
                                <LinkRow
                                    label={__('Rules that apply')}
                                    items={form.data.rule_ids.map((id) => ({ id, label: rules.find((rule) => rule.id === id)?.title ?? null }))}
                                    onRemove={(id) => toggle('rules', id, false)}
                                    addLabel={__('Link rule')}
                                    onAdd={() => setPicker('rules')}
                                />
                                <LinkRow
                                    label={__('Related lore')}
                                    items={form.data.lore_ids.map((id) => {
                                        const entry = otherLore.find((item) => item.id === id);

                                        return { id, label: entry ? `${loreTypeLabel(entry.type)} · ${entry.title}` : null };
                                    })}
                                    onRemove={(id) => toggle('lore', id, false)}
                                    addLabel={__('Link lore')}
                                    onAdd={() => setPicker('lore')}
                                />
                            </div>
                        </section>

                        <FormError error={firstError} />

                        <EntryFooter
                            note={active ? choice('Location of :count scene|Location of :count scenes', active.scene_ids.length) : __('Your links are saved with the place.')}
                            canDelete={Boolean(active)}
                            onDelete={destroy}
                            onCancel={cancel}
                            processing={form.processing}
                            saveLabel={__('Save place')}
                        />
                    </fieldset>
                </form>
            </div>

            {picker && (
                <Modal title={pickers[picker].title} onClose={() => setPicker(null)}>
                    <LinkPicker
                        options={pickers[picker].options}
                        checked={idsOf(picker)}
                        onToggle={(id, on) => toggle(picker, id, on)}
                        onDone={() => setPicker(null)}
                        empty={pickers[picker].empty}
                        note={__('Press Save place to keep the links.')}
                    />
                </Modal>
            )}
        </ProjectLayout>
    );
}
