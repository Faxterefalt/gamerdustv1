import { useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import type { Scene } from '../../types/scene';

interface SceneFormProps {
    projectId: number;
    scene?: Scene;
    method?: 'post' | 'put';
    submitLabel: string;
}

export default function SceneForm({ projectId, scene, method = 'post', submitLabel }: SceneFormProps) {
    const { data, setData, post, put, processing, errors } = useForm({
        title: scene?.title ?? '',
        order: scene?.order?.toString() ?? '1',
        summary: scene?.summary ?? '',
        conflict: scene?.conflict ?? '',
        expected_emotion: scene?.expected_emotion ?? '',
        interest_level: scene?.interest_level?.toString() ?? '',
        scene_type: scene?.scene_type ?? '',
        player_decision: scene?.player_decision ?? '',
        consequence: scene?.consequence ?? '',
        estimated_cost: scene?.estimated_cost ?? '',
    });

    const action = scene ? `/projects/${projectId}/scenes/${scene.id}` : `/projects/${projectId}/scenes`;
    const submit = (event: FormEvent) => {
        event.preventDefault();
        method === 'put' ? put(action) : post(action);
    };

    return (
        <form onSubmit={submit} className="space-y-5 border border-zinc-800 bg-zinc-900 p-5">
            <div className="grid gap-4 md:grid-cols-[1fr_120px]">
                <Field label="Titulo" error={errors.title}>
                    <input value={data.title} onChange={(event) => setData('title', event.target.value)} className={inputClass} />
                </Field>
                <Field label="Orden" error={errors.order}>
                    <input type="number" min="1" value={data.order} onChange={(event) => setData('order', event.target.value)} className={inputClass} />
                </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Field label="Emocion esperada" error={errors.expected_emotion}>
                    <input value={data.expected_emotion} onChange={(event) => setData('expected_emotion', event.target.value)} className={inputClass} />
                </Field>
                <Field label="Nivel de interes" error={errors.interest_level}>
                    <input type="number" min="1" max="10" value={data.interest_level} onChange={(event) => setData('interest_level', event.target.value)} className={inputClass} />
                </Field>
                <Field label="Tipo de escena" error={errors.scene_type}>
                    <input value={data.scene_type} onChange={(event) => setData('scene_type', event.target.value)} className={inputClass} />
                </Field>
            </div>

            <Field label="Resumen" error={errors.summary}>
                <textarea value={data.summary} onChange={(event) => setData('summary', event.target.value)} rows={4} className={inputClass} />
            </Field>
            <Field label="Conflicto" error={errors.conflict}>
                <textarea value={data.conflict} onChange={(event) => setData('conflict', event.target.value)} rows={3} className={inputClass} />
            </Field>
            <Field label="Decision del jugador" error={errors.player_decision}>
                <textarea value={data.player_decision} onChange={(event) => setData('player_decision', event.target.value)} rows={3} className={inputClass} />
            </Field>
            <Field label="Consecuencia" error={errors.consequence}>
                <textarea value={data.consequence} onChange={(event) => setData('consequence', event.target.value)} rows={3} className={inputClass} />
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
