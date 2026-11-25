import { Head } from '@inertiajs/react';
import { AlertTriangle, Link2, Lock, ScrollText } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import LinkPicker, { type LinkOption } from '../../../shared/components/LinkPicker';
import Modal, { FormError, PageHeading } from '../../../shared/components/ui';
import { __, choice } from '../../../shared/lib/i18n';
import { field } from '../../../shared/lib/styles';
import { sceneCodes } from '../../script/script.types';
import {
    CHARACTER_ROLES,
    RIGIDITIES,
    RULE_CATEGORIES,
    RULE_SCOPES,
    rigidityLabel,
    ruleCategoryLabel,
    type BibleEntry,
    type BibleEntryPageProps,
    type CharacterRole,
    type Rigidity,
    type RuleScope,
} from '../bible.types';
import BibleTabs from '../components/BibleTabs';
import EntryCatalog, { type CatalogItem } from '../components/EntryCatalog';
import { CreateIn, EntryFooter, EntryStatus } from '../components/EntryParts';
import LinkRow from '../components/LinkRow';
import useEntryEditor from '../hooks/useEntryEditor';

type Draft = {
    title: string;
    subtype: string;
    scope: RuleScope;
    statement: string;
    rigidity: Rigidity;
    origin: string;
    consequence: string;
    exceptions: string;
    narrative_function: string;
    description: string;
    location_ids: number[];
    scene_ids: number[];
    characters: { id: number; role: CharacterRole | null }[];
    mechanic_ids: number[];
};

type Picker = 'locations' | 'scenes' | 'characters' | 'mechanics' | null;

function draftOf(entry: BibleEntry | null): Draft {
    return {
        title: entry?.title ?? '',
        subtype: entry?.subtype ?? '',
        scope: entry?.scope ?? 'linked',
        statement: entry?.statement ?? '',
        rigidity: entry?.rigidity ?? 'unbreakable',
        origin: entry?.origin ?? '',
        consequence: entry?.consequence ?? '',
        exceptions: entry?.exceptions ?? '',
        narrative_function: entry?.narrative_function ?? '',
        description: entry?.description ?? '',
        location_ids: [...(entry?.location_ids ?? [])],
        scene_ids: [...(entry?.scene_ids ?? [])],
        characters: (entry?.characters ?? []).map((link) => ({ ...link })),
        mechanic_ids: [...(entry?.mechanic_ids ?? [])],
    };
}

export default function Rules({ project, entries, selected, scenes, characters, lore, mechanics }: BibleEntryPageProps) {
    const { form, active, selectedId, dirty, saved, choose, cancel, update, submit, destroy } = useEntryEditor<BibleEntry, Draft>({
        url: `/projects/${project.id}/bible/rules`,
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
    const places = lore.filter((entry) => entry.type === 'location');
    const characterName = (id: number) => characters.find((character) => character.id === id)?.name ?? null;

    // Catálogo agrupado por categoría (en el orden de RULE_CATEGORIES; sin categoría al final).
    const rank = (subtype: string | null) => {
        const index = RULE_CATEGORIES.findIndex((category) => category.value === subtype);

        return index === -1 ? RULE_CATEGORIES.length : index;
    };
    const needle = query.trim().toLocaleLowerCase();
    const items: CatalogItem[] = entries
        .filter((entry) => `${entry.title} ${entry.statement ?? ''} ${entry.description ?? ''}`.toLocaleLowerCase().includes(needle))
        .sort((a, b) => rank(a.subtype) - rank(b.subtype) || a.title.localeCompare(b.title))
        .map((entry) => ({
            id: entry.id,
            title: entry.title,
            icon: entry.rigidity === 'unbreakable' ? Lock : ScrollText,
            group: (ruleCategoryLabel(entry.subtype) ?? __('No category')).toLocaleUpperCase(),
            subtitle: rigidityLabel(entry.rigidity) ?? __('No rigidity defined'),
        }));

    // Avisos de coherencia en vivo (el Análisis IA hace las mismas comprobaciones al guardar).
    const warnings: string[] = [];
    if (form.data.rigidity === 'unbreakable') {
        form.data.characters
            .filter((link) => link.role === 'breaks')
            .forEach((link) => warnings.push(__(':name breaks a rule marked as unbreakable.', { name: characterName(link.id) ?? '?' })));
    }
    if (form.data.rigidity === 'costly' && !form.data.consequence.trim()) {
        warnings.push(__('It can be broken at a cost, but the cost is not defined.'));
    }
    if (form.data.scope === 'linked' && !form.data.location_ids.length) {
        warnings.push(__('It only applies in the linked places, but none is linked.'));
    }

    const keyOf = (kind: Exclude<Picker, 'characters' | null>) => (kind === 'locations' ? 'location_ids' : kind === 'scenes' ? 'scene_ids' : 'mechanic_ids');
    const idsOf = (kind: Exclude<Picker, null>) => (kind === 'characters' ? form.data.characters.map(({ id }) => id) : form.data[keyOf(kind)]);

    const toggle = (kind: Exclude<Picker, null>, id: number, on: boolean) => {
        if (kind === 'characters') {
            update('characters', on ? [...form.data.characters, { id, role: null }] : form.data.characters.filter((link) => link.id !== id));

            return;
        }
        const key = keyOf(kind);
        update(key, on ? [...form.data[key], id] : form.data[key].filter((value) => value !== id));
    };

    const setRole = (id: number, role: CharacterRole | null) => update('characters', form.data.characters.map((link) => (link.id === id ? { ...link, role } : link)));

    const pickers: Record<Exclude<Picker, null>, { title: string; options: LinkOption[]; empty: ReactNode }> = {
        locations: {
            title: __('Link places'),
            options: places.map((place) => ({ id: place.id, label: place.title })),
            empty: <CreateIn text={__('There are no places yet.')} href={`/projects/${project.id}/bible/locations`} section={__('Places')} />,
        },
        scenes: {
            title: __('Link scenes'),
            options: scenes.map((scene) => ({ id: scene.id, label: sceneLabel(scene.id) ?? scene.title })),
            empty: <CreateIn text={__('There are no scenes in this project yet.')} href={`/projects/${project.id}/scenes`} section={__('Scenes')} />,
        },
        characters: {
            title: __('Link characters'),
            options: characters.map((character) => ({ id: character.id, label: character.name })),
            empty: <CreateIn text={__('There are no characters in this project yet.')} href={`/projects/${project.id}/characters`} section={__('Characters')} />,
        },
        mechanics: {
            title: __('Link mechanics'),
            options: mechanics.map((mechanic) => ({ id: mechanic.id, label: mechanic.title })),
            empty: <CreateIn text={__('There are no mechanics yet.')} href={`/projects/${project.id}/mechanics`} section={__('Mechanics')} />,
        },
    };

    const firstError = Object.values(form.errors)[0] as string | undefined;
    const textarea = `${field} resize-y leading-7`;

    return (
        <ProjectLayout>
            <Head title={`${__('World rules')} - ${project.title}`} />
            <PageHeading title={__('Narrative Bible')} description={__('The laws of your world: what can never happen, what costs dearly and who dares to break them.')} />
            <BibleTabs projectId={project.id} active="rules" />

            <div className="grid items-start gap-5 lg:grid-cols-[225px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)]">
                <EntryCatalog
                    label={__('World rules')}
                    count={entries.length}
                    query={query}
                    onQuery={setQuery}
                    searchLabel={__('Search rules')}
                    addLabel={__('New rule')}
                    onAdd={() => choose(null)}
                    items={items}
                    selectedId={selectedId}
                    onSelect={(id) => choose(entries.find((entry) => entry.id === id) ?? null)}
                    disabled={form.processing}
                    empty={__('Add the first rule of your world.')}
                    footnote={entries.length ? __('The padlock marks unbreakable rules.') : undefined}
                />

                <form className="min-w-0 overflow-hidden rounded-xl border border-border bg-[#161e17]" onSubmit={submit}>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-5 sm:px-7">
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary">
                                {form.data.rigidity === 'unbreakable' ? <Lock size={18} strokeWidth={1.5} /> : <ScrollText size={18} strokeWidth={1.5} />}
                            </span>
                            <div>
                                <h2 className="font-display text-lg">{active ? __('Rule sheet: :name', { name: active.title }) : __('New rule')}</h2>
                                <p className="mt-0.5 text-[10px] text-[#9eb292]">{__('A clear rule makes the world believable and the conflicts sharper.')}</p>
                            </div>
                        </div>
                        <EntryStatus dirty={dirty} saved={saved} />
                    </div>

                    <fieldset disabled={form.processing} className="space-y-6 p-5 sm:p-7">
                        <div className="grid gap-5 md:grid-cols-3">
                            <label className="block text-xs">
                                {__('Name')} <span className="text-primary">*</span>
                                <input required maxLength={120} value={form.data.title} onChange={(event) => update('title', event.target.value)} placeholder={__('E.g. Curfew')} className={field} />
                            </label>
                            <label className="block text-xs">
                                {__('Category')}
                                <select value={form.data.subtype} onChange={(event) => update('subtype', event.target.value)} className={field}>
                                    <option value="">{__('No category')}</option>
                                    {RULE_CATEGORIES.map(({ value, label }) => (
                                        <option key={value} value={value}>
                                            {__(label)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block text-xs">
                                {__('Scope')}
                                <select value={form.data.scope} onChange={(event) => update('scope', event.target.value as RuleScope)} className={field}>
                                    {RULE_SCOPES.map(({ value, label }) => (
                                        <option key={value} value={value}>
                                            {__(label)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <label className="block text-xs">
                            {__('Statement of the rule')} <span className="text-primary">*</span>
                            <span className="ml-2 text-[9px] text-[#98ae8a]">{__('One sentence that can be checked.')}</span>
                            <textarea
                                required
                                rows={2}
                                maxLength={500}
                                value={form.data.statement}
                                onChange={(event) => update('statement', event.target.value)}
                                placeholder={__('E.g. Nobody can be on the surface between dusk and dawn.')}
                                className={`${textarea} !text-base font-medium`}
                            />
                        </label>

                        <fieldset>
                            <legend className="text-xs">{__('Rigidity')}</legend>
                            <div className="mt-2 grid gap-2 sm:grid-cols-3">
                                {RIGIDITIES.map(({ value, label, hint }) => (
                                    <label
                                        key={value}
                                        className={`cursor-pointer rounded-md border p-3 transition has-focus-visible:outline-2 has-focus-visible:outline-primary ${form.data.rigidity === value ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-[#bfceb4] hover:border-primary/30'}`}
                                    >
                                        <input type="radio" name="rigidity" value={value} checked={form.data.rigidity === value} onChange={() => update('rigidity', value)} className="sr-only" />
                                        <span className="flex items-center gap-2 text-xs font-medium">
                                            {value === 'unbreakable' && <Lock size={12} />}
                                            {__(label)}
                                        </span>
                                        <span className="mt-1.5 block text-[10px] leading-5 text-[#a2b597]">{__(hint)}</span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>

                        <div className="grid gap-5 xl:grid-cols-2">
                            <label className="block text-xs">
                                {__('Origin (why it exists)')}
                                <textarea rows={3} maxLength={2000} value={form.data.origin} onChange={(event) => update('origin', event.target.value)} className={textarea} />
                            </label>
                            <label className="block text-xs">
                                {__('Consequence if broken')}
                                <textarea rows={3} maxLength={2000} value={form.data.consequence} onChange={(event) => update('consequence', event.target.value)} className={textarea} />
                            </label>
                            <label className="block text-xs">
                                {__('Exceptions')}
                                <textarea
                                    rows={3}
                                    maxLength={2000}
                                    value={form.data.exceptions}
                                    onChange={(event) => update('exceptions', event.target.value)}
                                    placeholder={__('Who or what is allowed to skip it?')}
                                    className={textarea}
                                />
                            </label>
                            <label className="block text-xs">
                                {__('Narrative function')} <span className="text-primary">*</span>
                                <textarea
                                    required
                                    rows={3}
                                    maxLength={2000}
                                    value={form.data.narrative_function}
                                    onChange={(event) => update('narrative_function', event.target.value)}
                                    placeholder={__('What tension or decision does this rule create?')}
                                    className={textarea}
                                />
                            </label>
                        </div>

                        <section className="rounded-lg border border-[#3a4a33] bg-background/40 p-4 sm:p-5">
                            <h3 className="mb-5 flex items-center gap-2 text-xs font-medium text-[#dce6d5]">
                                <Link2 size={15} className="text-primary" /> {__('Narrative links')}
                            </h3>
                            <div className="space-y-5">
                                <LinkRow
                                    label={__('Places where it applies')}
                                    note={form.data.scope === 'global' ? __('It applies everywhere; link the places where it matters most.') : undefined}
                                    items={form.data.location_ids.map((id) => ({ id, label: places.find((place) => place.id === id)?.title ?? null }))}
                                    onRemove={(id) => toggle('locations', id, false)}
                                    addLabel={__('Link place')}
                                    onAdd={() => setPicker('locations')}
                                />
                                <LinkRow
                                    label={__('Scenes that test it')}
                                    items={form.data.scene_ids.map((id) => ({ id, label: sceneLabel(id) }))}
                                    onRemove={(id) => toggle('scenes', id, false)}
                                    addLabel={__('Link scene')}
                                    onAdd={() => setPicker('scenes')}
                                />
                                <LinkRow
                                    label={__('Characters')}
                                    items={form.data.characters.map(({ id }) => ({ id, label: characterName(id) }))}
                                    onRemove={(id) => toggle('characters', id, false)}
                                    addLabel={__('Link character')}
                                    onAdd={() => setPicker('characters')}
                                    extra={(id, name) => (
                                        <select
                                            aria-label={__('Relation of :name with the rule', { name })}
                                            value={form.data.characters.find((link) => link.id === id)?.role ?? ''}
                                            onChange={(event) => setRole(id, (event.target.value || null) as CharacterRole | null)}
                                            className="rounded border border-primary/20 bg-background px-1 py-0.5 text-[10px] text-[#c5d9b7] outline-none focus:border-primary"
                                        >
                                            <option value="">—</option>
                                            {CHARACTER_ROLES.map(({ value, label }) => (
                                                <option key={value} value={value}>
                                                    {__(label)}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                />
                                <LinkRow
                                    label={__('Related mechanics')}
                                    items={form.data.mechanic_ids.map((id) => ({ id, label: mechanics.find((mechanic) => mechanic.id === id)?.title ?? null }))}
                                    onRemove={(id) => toggle('mechanics', id, false)}
                                    addLabel={__('Link mechanic')}
                                    onAdd={() => setPicker('mechanics')}
                                />
                            </div>
                        </section>

                        {warnings.length > 0 && (
                            <div className="rounded-lg border border-dashed border-[#e2c08a]/40 bg-[#e2c08a]/5 p-4">
                                <p className="flex items-center gap-2 text-xs font-medium text-[#ecd2a4]">
                                    <AlertTriangle size={14} /> {choice('Possible inconsistency|Possible inconsistencies', warnings.length)}
                                </p>
                                <ul className="mt-2 list-disc space-y-1 pl-6 text-[11px] leading-6 text-[#e0cfae]">
                                    {warnings.map((warning) => (
                                        <li key={warning}>{warning}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <details className="rounded-lg border border-border px-4 py-3" open={Boolean(form.data.description) && !form.data.statement}>
                            <summary className="cursor-pointer text-[11px] text-[#aabd9e]">{__('Additional notes')}</summary>
                            <textarea
                                aria-label={__('Additional notes')}
                                rows={3}
                                maxLength={3000}
                                value={form.data.description}
                                onChange={(event) => update('description', event.target.value)}
                                className={`${textarea} mt-4`}
                            />
                        </details>

                        <FormError error={firstError} />

                        <EntryFooter
                            note={__('The AI Analysis checks this rule against your story.')}
                            canDelete={Boolean(active)}
                            onDelete={destroy}
                            onCancel={cancel}
                            processing={form.processing}
                            saveLabel={__('Save rule')}
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
                        note={__('Press Save rule to keep the links.')}
                    />
                </Modal>
            )}
        </ProjectLayout>
    );
}
