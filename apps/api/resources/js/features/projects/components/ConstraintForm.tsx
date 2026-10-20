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
                <h2 className="font-semibold text-white">Planteamiento narrativo</h2>
                <p className="mt-1 text-sm text-zinc-400">Todos los campos son opcionales: complétalos progresivamente durante el desarrollo.</p>
            </div>

            <Field label="Premisa" help="Resumen breve de la idea principal." error={errors.premise}>
                <textarea
                    value={data.premise}
                    onChange={(event) => setData('premise', event.target.value)}
                    rows={2}
                    maxLength={2000}
                    placeholder="Ej.: Una archivista debe reconstruir la memoria de una colonia antes de que su mito fundador se derrumbe."
                    className={inputClass}
                />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
                <Field label="Tema central" help="Idea que aborda la historia." error={errors.central_theme}>
                    <input
                        value={data.central_theme}
                        onChange={(event) => setData('central_theme', event.target.value)}
                        maxLength={255}
                        placeholder="Ej.: memoria, identidad, pérdida"
                        className={inputClass}
                    />
                </Field>
                <Field label="Ambientación" help="Contexto, lugar o época." error={errors.setting}>
                    <input
                        value={data.setting}
                        onChange={(event) => setData('setting', event.target.value)}
                        maxLength={2000}
                        placeholder="Ej.: Colonia aislada en un planeta de polvo"
                        className={inputClass}
                    />
                </Field>
                <Field label="Conflicto principal" help="Problema u oposición que impulsa los hechos." error={errors.central_conflict}>
                    <textarea
                        value={data.central_conflict}
                        onChange={(event) => setData('central_conflict', event.target.value)}
                        rows={2}
                        maxLength={2000}
                        placeholder="Ej.: La verdad puede salvar a la colonia o destruir su identidad."
                        className={inputClass}
                    />
                </Field>
                <Field label="Objetivo principal" help="Qué intenta conseguir el protagonista o el jugador." error={errors.player_objective}>
                    <textarea
                        value={data.player_objective}
                        onChange={(event) => setData('player_objective', event.target.value)}
                        rows={2}
                        maxLength={2000}
                        placeholder="Ej.: Reconstruir la memoria de la colonia."
                        className={inputClass}
                    />
                </Field>
            </div>

            <Field label="Desenlace previsto" help="Resultado o posibles desenlaces hacia los que se orienta la historia." error={errors.expected_outcome}>
                <textarea
                    value={data.expected_outcome}
                    onChange={(event) => setData('expected_outcome', event.target.value)}
                    rows={2}
                    maxLength={2000}
                    placeholder="Ej.: El mito se derrumba, o se reescribe con una verdad compartida."
                    className={inputClass}
                />
            </Field>

            <div className="flex items-center gap-3">
                <button type="submit" disabled={processing} className="border border-amber-600 px-4 py-2 text-sm text-amber-100 hover:bg-amber-950 disabled:opacity-50">
                    {processing ? 'Guardando...' : 'Guardar planteamiento'}
                </button>
                {recentlySuccessful && <span className="text-sm text-emerald-300">Cambios guardados correctamente.</span>}
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
