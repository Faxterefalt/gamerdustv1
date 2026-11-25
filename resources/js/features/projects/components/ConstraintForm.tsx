import { __ } from '../../../shared/lib/i18n';
import { useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import type { ConstraintUsage, Project } from '../projects.types';
import { fieldBlock, primarySm } from '../../../shared/lib/styles';

interface ConstraintFormProps {
    project: Project;
    /** Consumo actual, para ver cada límite frente a lo que ya hay. */
    usage?: ConstraintUsage;
}

const limit = (value: number | string | null | undefined) => (value === null || value === undefined ? '' : String(Number(value)));

export default function ConstraintForm({ project, usage }: ConstraintFormProps) {
    const constraint = project.constraint;
    const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
        premise: project.premise ?? '',
        central_theme: constraint?.central_theme ?? '',
        central_conflict: project.central_conflict ?? '',
        player_objective: constraint?.player_objective ?? '',
        setting: constraint?.setting ?? '',
        expected_outcome: constraint?.expected_outcome ?? '',
        assignment: constraint?.assignment ?? '',
        max_characters: limit(constraint?.max_characters),
        max_pages: limit(constraint?.max_pages),
        max_budget: limit(constraint?.max_budget),
        requires_twist: Boolean(constraint?.requires_twist),
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        post(`/projects/${project.id}/constraints`, { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="space-y-5 rounded-lg border border-border bg-surface p-5 sm:p-6">
            <div>
                <h2 className="text-lg font-bold">{__('Narrative setup')}</h2>
                <p className="mt-1 text-sm text-muted">{__('All fields are optional: fill them in gradually during development.')}</p>
            </div>

            <Field label={__('Premise')} help={__('Brief summary of the main idea.')} error={errors.premise}>
                <textarea
                    value={data.premise}
                    onChange={(event) => setData('premise', event.target.value)}
                    rows={2}
                    maxLength={2000}
                    placeholder={__('E.g.: An archivist must rebuild the memory of a colony before its founding myth collapses.')}
                    className={inputClass}
                />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
                <Field label={__('Central theme')} help={__('The idea the story explores.')} error={errors.central_theme}>
                    <input
                        value={data.central_theme}
                        onChange={(event) => setData('central_theme', event.target.value)}
                        maxLength={255}
                        placeholder={__('E.g.: memory, identity, loss')}
                        className={inputClass}
                    />
                </Field>
                <Field label={__('Setting')} help={__('Context, place or era.')} error={errors.setting}>
                    <input
                        value={data.setting}
                        onChange={(event) => setData('setting', event.target.value)}
                        maxLength={2000}
                        placeholder={__('E.g.: An isolated colony on a dust planet')}
                        className={inputClass}
                    />
                </Field>
                <Field label={__('Main conflict')} help={__('The problem or opposition that drives events.')} error={errors.central_conflict}>
                    <textarea
                        value={data.central_conflict}
                        onChange={(event) => setData('central_conflict', event.target.value)}
                        rows={2}
                        maxLength={2000}
                        placeholder={__('E.g.: The truth can save the colony or destroy its identity.')}
                        className={inputClass}
                    />
                </Field>
                <Field label={__('Main objective')} help={__('What the protagonist or the player is trying to achieve.')} error={errors.player_objective}>
                    <textarea
                        value={data.player_objective}
                        onChange={(event) => setData('player_objective', event.target.value)}
                        rows={2}
                        maxLength={2000}
                        placeholder={__('E.g.: Rebuild the memory of the colony.')}
                        className={inputClass}
                    />
                </Field>
            </div>

            <Field label={__('Expected outcome')} help={__('The outcome or possible endings the story is heading towards.')} error={errors.expected_outcome}>
                <textarea
                    value={data.expected_outcome}
                    onChange={(event) => setData('expected_outcome', event.target.value)}
                    rows={2}
                    maxLength={2000}
                    placeholder={__('E.g.: The myth collapses, or is rewritten with a shared truth.')}
                    className={inputClass}
                />
            </Field>

            <Field label={__('Assignment / client')} help={__('Who commissions the project and what they expect from it.')} error={errors.assignment}>
                <textarea
                    value={data.assignment}
                    onChange={(event) => setData('assignment', event.target.value)}
                    rows={2}
                    maxLength={2000}
                    placeholder={__('E.g.: A one-hour vertical slice for a narrative games contest.')}
                    className={inputClass}
                />
            </Field>

            <fieldset id="limits" className="scroll-mt-24 space-y-4 border-t border-border pt-5">
                <legend className="sr-only">{__('Production limits')}</legend>
                <div>
                    <h3 className="font-bold">{__('Production limits')}</h3>
                    <p className="mt-1 text-sm text-muted">{__('Leave a limit empty to have no limit. Reaching a limit exactly is not an excess.')}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <Field
                        label={__('Max. characters')}
                        help={usage ? __('Now: :count', { count: usage.characters }) : undefined}
                        error={errors.max_characters}
                    >
                        <input type="number" min={0} step={1} value={data.max_characters} onChange={(event) => setData('max_characters', event.target.value)} className={inputClass} />
                        {usage && <UsageMeter value={usage.characters} max={data.max_characters} />}
                    </Field>
                    <Field
                        label={__('Max. pages')}
                        help={usage ? __('Now: :pages (about :words words)', { pages: usage.pages, words: usage.words }) : undefined}
                        error={errors.max_pages}
                    >
                        <input type="number" min={0} step={1} value={data.max_pages} onChange={(event) => setData('max_pages', event.target.value)} className={inputClass} />
                        {usage && <UsageMeter value={usage.pages} max={data.max_pages} />}
                    </Field>
                    <Field
                        label={__('Budget (cost points)')}
                        help={usage ? __('Now: :points points', { points: usage.cost_points }) : undefined}
                        error={errors.max_budget}
                    >
                        <input type="number" min={0} step={0.01} value={data.max_budget} onChange={(event) => setData('max_budget', event.target.value)} className={inputClass} />
                        {usage && <UsageMeter value={usage.cost_points} max={data.max_budget} />}
                    </Field>
                </div>
                {usage && (
                    <p className="text-xs text-subtle">
                        {__('Pages are estimated from the words of the script (:per per page). Cost points add up the heuristic estimate of each scene and dialogue node.', {
                            per: usage.words_per_page,
                        })}
                    </p>
                )}
                <label className="flex min-h-11 items-start gap-3 text-sm text-foreground">
                    <input type="checkbox" checked={data.requires_twist} onChange={(event) => setData('requires_twist', event.target.checked)} className="mt-0.5 size-5 shrink-0" />
                    <span>
                        {__('The story must include a plot twist')}
                        <span className="block text-xs text-subtle">{__('It is reported as a contextual review, not as an error.')}</span>
                    </span>
                </label>
            </fieldset>

            <div className="flex items-center gap-3">
                <button type="submit" disabled={processing} className={primarySm}>
                    {processing ? __('Saving...') : __('Save setup')}
                </button>
                {recentlySuccessful && <span className="text-sm text-success">{__('Changes saved successfully.')}</span>}
            </div>
        </form>
    );
}

const inputClass = fieldBlock;

function Field({ label, help, error, children }: { label: string; help?: string; error?: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block text-sm font-bold text-foreground">{label}</span>
            {help && <span className="mb-2 block text-xs text-muted">{help}</span>}
            {children}
            {error && <span className="mt-1 block text-sm text-danger">{error}</span>}
        </label>
    );
}

/**
 * Uso frente al límite, como una barra de HUD: liquen mientras cabe, rojo si lo supera (igualar no es exceso).
 * Decorativa: la cifra exacta ya está en el texto de ayuda del campo.
 */
function UsageMeter({ value, max }: { value: number; max: string | number }) {
    const limit = Number(max);

    if (!limit || limit <= 0) {
        return null;
    }

    const over = value > limit;

    return (
        <span aria-hidden="true" className="mt-2 flex items-center gap-3">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                <span className={`block h-full rounded-full ${over ? 'bg-danger' : 'bg-primary'}`} style={{ width: `${Math.min(100, (value / limit) * 100)}%` }} />
            </span>
            <span className={`font-pixel text-sm ${over ? 'text-danger' : 'text-foreground'}`}>
                {value}/{limit}
            </span>
        </span>
    );
}
