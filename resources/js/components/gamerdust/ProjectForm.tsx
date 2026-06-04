import { useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import type { NarrativeType, Project, ProjectStatus } from '../../types/project';

interface ProjectFormProps {
    project?: Project;
    action: string;
    method?: 'post' | 'put';
    submitLabel: string;
}

export default function ProjectForm({ project, action, method = 'post', submitLabel }: ProjectFormProps) {
    const { data, setData, post, put, processing, errors } = useForm({
        title: project?.title ?? '',
        description: project?.description ?? '',
        game_genre: project?.game_genre ?? '',
        narrative_type: project?.narrative_type ?? 'balanced_narrative',
        premise: project?.premise ?? '',
        central_conflict: project?.central_conflict ?? '',
        target_audience: project?.target_audience ?? '',
        status: project?.status ?? 'draft',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        method === 'put' ? put(action) : post(action);
    };

    return (
        <form onSubmit={submit} className="space-y-5 border border-zinc-800 bg-zinc-900 p-5">
            <Field label="Titulo" error={errors.title}>
                <input value={data.title} onChange={(event) => setData('title', event.target.value)} className={inputClass} />
            </Field>

            <Field label="Descripcion" error={errors.description}>
                <textarea value={data.description} onChange={(event) => setData('description', event.target.value)} rows={3} className={inputClass} />
            </Field>

            <div className="grid gap-4 md:grid-cols-3">
                <Field label="Genero" error={errors.game_genre}>
                    <input value={data.game_genre} onChange={(event) => setData('game_genre', event.target.value)} className={inputClass} />
                </Field>
                <Field label="Tipo narrativo" error={errors.narrative_type}>
                    <select value={data.narrative_type} onChange={(event) => setData('narrative_type', event.target.value as NarrativeType)} className={inputClass}>
                        <option value="game_story">Game story</option>
                        <option value="balanced_narrative">Balanced narrative</option>
                        <option value="player_story">Player story</option>
                    </select>
                </Field>
                <Field label="Estado" error={errors.status}>
                    <select value={data.status} onChange={(event) => setData('status', event.target.value as ProjectStatus)} className={inputClass}>
                        <option value="draft">Borrador</option>
                        <option value="in_progress">En progreso</option>
                        <option value="completed">Completado</option>
                    </select>
                </Field>
            </div>

            <Field label="Premisa" error={errors.premise}>
                <textarea value={data.premise} onChange={(event) => setData('premise', event.target.value)} rows={3} className={inputClass} />
            </Field>

            <Field label="Conflicto central" error={errors.central_conflict}>
                <textarea value={data.central_conflict} onChange={(event) => setData('central_conflict', event.target.value)} rows={3} className={inputClass} />
            </Field>

            <Field label="Audiencia objetivo" error={errors.target_audience}>
                <input value={data.target_audience} onChange={(event) => setData('target_audience', event.target.value)} className={inputClass} />
            </Field>

            <button type="submit" disabled={processing} className="border border-amber-600 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-950 disabled:opacity-50">
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
