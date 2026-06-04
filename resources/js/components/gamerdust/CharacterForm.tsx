import { useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import type { Character } from '../../types/character';

interface CharacterFormProps {
    projectId: number;
    character?: Character;
    method?: 'post' | 'put';
    submitLabel: string;
}

export default function CharacterForm({ projectId, character, method = 'post', submitLabel }: CharacterFormProps) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: character?.name ?? '',
        role: character?.role ?? '',
        archetype: character?.archetype ?? '',
        age: character?.age?.toString() ?? '',
        gender: character?.gender ?? '',
        background: character?.background ?? '',
        personality: character?.personality ?? '',
        speech_style: character?.speech_style ?? '',
        motivation: character?.motivation ?? '',
        fear: character?.fear ?? '',
        desire: character?.desire ?? '',
        emotional_arc: character?.emotional_arc ?? '',
        visual_description: character?.visual_description ?? '',
        voice_notes: character?.voice_notes ?? '',
    });

    const action = character ? `/projects/${projectId}/characters/${character.id}` : `/projects/${projectId}/characters`;
    const submit = (event: FormEvent) => {
        event.preventDefault();
        method === 'put' ? put(action) : post(action);
    };

    return (
        <form onSubmit={submit} className="space-y-5 border border-zinc-800 bg-zinc-900 p-5">
            <div className="grid gap-4 md:grid-cols-3">
                <Field label="Nombre" error={errors.name}>
                    <input value={data.name} onChange={(event) => setData('name', event.target.value)} className={inputClass} />
                </Field>
                <Field label="Rol" error={errors.role}>
                    <input value={data.role} onChange={(event) => setData('role', event.target.value)} className={inputClass} />
                </Field>
                <Field label="Arquetipo" error={errors.archetype}>
                    <input value={data.archetype} onChange={(event) => setData('archetype', event.target.value)} className={inputClass} />
                </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Field label="Edad" error={errors.age}>
                    <input type="number" min="0" value={data.age} onChange={(event) => setData('age', event.target.value)} className={inputClass} />
                </Field>
                <Field label="Genero" error={errors.gender}>
                    <input value={data.gender} onChange={(event) => setData('gender', event.target.value)} className={inputClass} />
                </Field>
            </div>

            {[
                ['Trasfondo', 'background'],
                ['Personalidad', 'personality'],
                ['Estilo de habla', 'speech_style'],
                ['Motivacion', 'motivation'],
                ['Miedo', 'fear'],
                ['Deseo', 'desire'],
                ['Arco emocional', 'emotional_arc'],
                ['Descripcion visual', 'visual_description'],
                ['Notas de voz', 'voice_notes'],
            ].map(([label, key]) => (
                <Field key={key} label={label} error={errors[key as keyof typeof errors]}>
                    <textarea
                        value={data[key as keyof typeof data]}
                        onChange={(event) => setData(key as keyof typeof data, event.target.value)}
                        rows={3}
                        className={inputClass}
                    />
                </Field>
            ))}

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
