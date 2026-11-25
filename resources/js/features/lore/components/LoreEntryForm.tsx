import { __ } from '../../../shared/lib/i18n';
import { useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import type { LoreEntry, LoreType } from '../lore.types';
import { LORE_TYPES, loreTypeLabel } from '../loreOptions';
import { fieldBlock, primarySm } from '../../../shared/lib/styles';

interface LoreEntryFormProps {
    projectId: number;
    entry?: LoreEntry;
    method?: 'post' | 'put';
    submitLabel: string;
}

export default function LoreEntryForm({ projectId, entry, method = 'post', submitLabel }: LoreEntryFormProps) {
    const { data, setData, post, put, processing, errors } = useForm({
        title: entry?.title ?? '',
        // ?type=location (p. ej. desde la Biblia narrativa) preselecciona el tipo de una entrada nueva.
        type: entry?.type ?? initialType(),
        description: entry?.description ?? '',
        narrative_function: entry?.narrative_function ?? '',
        emotional_tone: entry?.emotional_tone ?? '',
    });

    const action = entry ? `/projects/${projectId}/lore/${entry.id}` : `/projects/${projectId}/lore`;
    const submit = (event: FormEvent) => {
        event.preventDefault();
        method === 'put' ? put(action) : post(action);
    };

    return (
        <form onSubmit={submit} className="space-y-5 rounded-lg border border-border bg-surface p-5 sm:p-6">
            <Field label={__('Title')} error={errors.title}>
                <input value={data.title} onChange={(event) => setData('title', event.target.value)} className={inputClass} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
                <Field label={__('Type')} error={errors.type}>
                    <select value={data.type} onChange={(event) => setData('type', event.target.value as LoreType)} className={inputClass}>
                        {LORE_TYPES.map((type) => (
                            <option key={type} value={type}>
                                {loreTypeLabel(type)}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label={__('Emotional tone')} error={errors.emotional_tone}>
                    <input value={data.emotional_tone} onChange={(event) => setData('emotional_tone', event.target.value)} className={inputClass} />
                </Field>
            </div>
            <Field label={__('Description')} error={errors.description}>
                <textarea value={data.description} onChange={(event) => setData('description', event.target.value)} rows={5} className={inputClass} />
            </Field>
            <Field label={__('Narrative function')} error={errors.narrative_function}>
                <textarea value={data.narrative_function} onChange={(event) => setData('narrative_function', event.target.value)} rows={4} className={inputClass} />
            </Field>
            <button type="submit" disabled={processing} className={primarySm}>
                {submitLabel}
            </button>
        </form>
    );
}

const inputClass = fieldBlock;

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-foreground">{label}</span>
            {children}
            {error && <span className="mt-1 block text-sm text-danger">{error}</span>}
        </label>
    );
}

function initialType(): LoreType {
    const requested = new URLSearchParams(window.location.search).get('type');

    return LORE_TYPES.includes(requested as LoreType) ? (requested as LoreType) : 'concept';
}
