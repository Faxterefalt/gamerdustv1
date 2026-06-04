import { useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import type { ProjectConstraint } from '../../types/project';

interface ConstraintFormProps {
    projectId: number;
    constraint?: ProjectConstraint | null;
}

export default function ConstraintForm({ projectId, constraint }: ConstraintFormProps) {
    const { data, setData, post, processing, errors } = useForm({
        main_emotional_tone: constraint?.main_emotional_tone ?? '',
        dominant_emotion: constraint?.dominant_emotion ?? '',
        secondary_emotions: (constraint?.secondary_emotions ?? []).join('\n'),
        world_type: constraint?.world_type ?? '',
        player_role: constraint?.player_role ?? '',
        branching_level: constraint?.branching_level ?? '',
        required_elements: (constraint?.required_elements ?? []).join('\n'),
        forbidden_elements: (constraint?.forbidden_elements ?? []).join('\n'),
        creative_notes: constraint?.creative_notes ?? '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        post(`/projects/${projectId}/constraints`);
    };

    return (
        <form onSubmit={submit} className="space-y-4 border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="font-semibold text-white">Restricciones base</h2>
            <div className="grid gap-4 md:grid-cols-3">
                <Field label="Tono principal" error={errors.main_emotional_tone}>
                    <input value={data.main_emotional_tone} onChange={(event) => setData('main_emotional_tone', event.target.value)} className={inputClass} />
                </Field>
                <Field label="Emocion dominante" error={errors.dominant_emotion}>
                    <input value={data.dominant_emotion} onChange={(event) => setData('dominant_emotion', event.target.value)} className={inputClass} />
                </Field>
                <Field label="Nivel de ramificacion" error={errors.branching_level}>
                    <input value={data.branching_level} onChange={(event) => setData('branching_level', event.target.value)} className={inputClass} />
                </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Field label="Tipo de mundo" error={errors.world_type}>
                    <input value={data.world_type} onChange={(event) => setData('world_type', event.target.value)} className={inputClass} />
                </Field>
                <Field label="Rol del jugador" error={errors.player_role}>
                    <input value={data.player_role} onChange={(event) => setData('player_role', event.target.value)} className={inputClass} />
                </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <Field label="Emociones secundarias" error={errors.secondary_emotions}>
                    <textarea value={data.secondary_emotions} onChange={(event) => setData('secondary_emotions', event.target.value)} rows={4} className={inputClass} />
                </Field>
                <Field label="Elementos requeridos" error={errors.required_elements}>
                    <textarea value={data.required_elements} onChange={(event) => setData('required_elements', event.target.value)} rows={4} className={inputClass} />
                </Field>
                <Field label="Elementos prohibidos" error={errors.forbidden_elements}>
                    <textarea value={data.forbidden_elements} onChange={(event) => setData('forbidden_elements', event.target.value)} rows={4} className={inputClass} />
                </Field>
            </div>
            <Field label="Notas creativas" error={errors.creative_notes}>
                <textarea value={data.creative_notes} onChange={(event) => setData('creative_notes', event.target.value)} rows={4} className={inputClass} />
            </Field>
            <button type="submit" disabled={processing} className="border border-amber-600 px-4 py-2 text-sm text-amber-100 hover:bg-amber-950 disabled:opacity-50">
                Guardar restricciones
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
