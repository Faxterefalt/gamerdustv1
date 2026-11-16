import { __ } from '../../../shared/lib/i18n';
import { useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import type { Project } from '../projects.types';

interface ConstraintFormProps {
    project: Project;
}

export default function ConstraintForm({ project }: ConstraintFormProps) {
    const constraint = project.constraint;
    const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
        premise: project.premise ?? '',
        central_theme: constraint?.central_theme ?? '',
        central_conflict: project.central_conflict ?? '',
        player_objective: constraint?.player_objective ?? '',
        setting: constraint?.setting ?? '',
        expected_outcome: constraint?.expected_outcome ?? '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        post(`/projects/${project.id}/constraints`, { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="space-y-4 border border-zinc-800 bg-zinc-900 p-5">
            <div>
                <h2 className="font-semibold text-white">{__('Narrative setup')}</h2>
                <p className="mt-1 text-sm text-zinc-400">{__('All fields are optional: fill them in gradually during development.')}</p>
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

            <div className="flex items-center gap-3">
                <button type="submit" disabled={processing} className="border border-amber-600 px-4 py-2 text-sm text-amber-100 hover:bg-amber-950 disabled:opacity-50">
                    {processing ? __('Saving...') : __('Save setup')}
                </button>
                {recentlySuccessful && <span className="text-sm text-emerald-300">{__('Changes saved successfully.')}</span>}
            </div>
        </form>
    );
}

const inputClass = 'w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500';

function Field({ label, help, error, children }: { label: string; help?: string; error?: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-200">{label}</span>
            {help && <span className="mb-2 block text-xs text-zinc-500">{help}</span>}
            {children}
            {error && <span className="mt-1 block text-sm text-rose-300">{error}</span>}
        </label>
    );
}
