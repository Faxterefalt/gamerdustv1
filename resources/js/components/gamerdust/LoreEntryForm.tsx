import { useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import type { LoreEntry, LoreType } from '../../types/lore';

interface LoreEntryFormProps {
    projectId: number;
    entry?: LoreEntry;
    method?: 'post' | 'put';
    submitLabel: string;
}

export default function LoreEntryForm({ projectId, entry, method = 'post', submitLabel }: LoreEntryFormProps) {
    const { data, setData, post, put, processing, errors } = useForm({
        title: entry?.title ?? '',
        type: entry?.type ?? 'concept',
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
        <form onSubmit={submit} className="space-y-5 border border-zinc-800 bg-zinc-900 p-5">
            <Field label="Titulo" error={errors.title}>
                <input value={data.title} onChange={(event) => setData('title', event.target.value)} className={inputClass} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
                <Field label="Tipo" error={errors.type}>
                    <select value={data.type} onChange={(event) => setData('type', event.target.value as LoreType)} className={inputClass}>
                        {['rule', 'history', 'faction', 'location', 'object', 'event', 'concept'].map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Tono emocional" error={errors.emotional_tone}>
                    <input value={data.emotional_tone} onChange={(event) => setData('emotional_tone', event.target.value)} className={inputClass} />
                </Field>
            </div>
            <Field label="Descripcion" error={errors.description}>
                <textarea value={data.description} onChange={(event) => setData('description', event.target.value)} rows={5} className={inputClass} />
            </Field>
            <Field label="Funcion narrativa" error={errors.narrative_function}>
                <textarea value={data.narrative_function} onChange={(event) => setData('narrative_function', event.target.value)} rows={4} className={inputClass} />
            </Field>
            <button type="submit" disabled={processing} className="border border-amber-600 px-4 py-2 text-sm text-amber-100 hover:bg-amber-950 disabled:opacity-50">
                {submitLabel}
            </button>
        </form>
    );
}

const inputClass = 'w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500';

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">{label}</span>
            {children}
            {error && <span className="mt-1 block text-sm text-rose-300">{error}</span>}
        </label>
    );
}
