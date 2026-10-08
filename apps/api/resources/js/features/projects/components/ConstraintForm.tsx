import { useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import type { NarrativeType, Project } from '../projects.types';

interface ConstraintFormProps {
    project: Project;
}

const genres = [
    ['fantasy', 'Fantasía'],
    ['science_fiction', 'Ciencia ficción'],
    ['mystery', 'Misterio'],
    ['horror', 'Terror'],
    ['drama', 'Drama'],
    ['adventure', 'Aventura'],
    ['comedy', 'Comedia'],
    ['romance', 'Romance'],
    ['thriller', 'Thriller'],
    ['other', 'Otro'],
] as const;

const narrativeTypes: { value: NarrativeType; label: string; help: string }[] = [
    { value: 'linear', label: 'Lineal', help: 'La historia sigue una secuencia principal sin bifurcaciones que alteren el recorrido.' },
    { value: 'branching', label: 'Ramificada', help: 'Las decisiones del jugador permiten recorrer diferentes caminos narrativos.' },
    { value: 'balanced', label: 'Balanceada', help: 'Combina una historia principal definida con decisiones y variaciones que pueden converger.' },
];

const required = 'Este campo es obligatorio.';

export default function ConstraintForm({ project }: ConstraintFormProps) {
    const constraint = project.constraint;
    const { data, setData, post, processing, errors, setError, clearErrors, recentlySuccessful } = useForm({
        premise: project.premise ?? '',
        central_conflict: project.central_conflict ?? '',
        narrative_genre: constraint?.narrative_genre ?? '',
        central_theme: constraint?.central_theme ?? '',
        setting: constraint?.setting ?? '',
        player_objective: constraint?.player_objective ?? '',
        narrative_type: project.narrative_type ?? 'balanced',
    });

    const selectedType = narrativeTypes.find((type) => type.value === data.narrative_type);
    const branchingEnabled = data.narrative_type !== 'linear';

    const submit = (event: FormEvent) => {
        event.preventDefault();
        clearErrors();

        const missing = (['premise', 'central_conflict', 'narrative_genre', 'central_theme', 'setting', 'player_objective'] as const).filter(
            (field) => !data[field].trim(),
        );
        if (missing.length > 0) {
            missing.forEach((field) => setError(field, required));
            return;
        }

        post(`/projects/${project.id}/constraints`, { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="space-y-5 border border-zinc-800 bg-zinc-900 p-5">
            <div>
                <h2 className="font-semibold text-white">Configuración narrativa inicial</h2>
                <p className="mt-1 text-sm text-zinc-400">Define las bases de tu historia antes de empezar a escribir. Puedes modificarlas cuando quieras.</p>
            </div>

            <Field label="Premisa" help="La idea principal de la historia, en pocas líneas." error={errors.premise}>
                <textarea
                    value={data.premise}
                    onChange={(event) => setData('premise', event.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Ej.: Una archivista debe reconstruir la memoria de una colonia antes de que su mito fundador se derrumbe."
                    className={inputClass}
                />
            </Field>

            <Field label="Conflicto principal" help="El problema central que impulsa los acontecimientos." error={errors.central_conflict}>
                <textarea
                    value={data.central_conflict}
                    onChange={(event) => setData('central_conflict', event.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Ej.: La verdad puede salvar a la colonia, pero también destruir su identidad."
                    className={inputClass}
                />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
                <Field label="Género narrativo" error={errors.narrative_genre}>
                    <select value={data.narrative_genre} onChange={(event) => setData('narrative_genre', event.target.value)} className={inputClass}>
                        <option value="">Selecciona un género</option>
                        {genres.map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Tema central" help="Conceptos que aborda la historia." error={errors.central_theme}>
                    <input
                        value={data.central_theme}
                        onChange={(event) => setData('central_theme', event.target.value)}
                        maxLength={255}
                        placeholder="Ej.: identidad, pérdida, venganza"
                        className={inputClass}
                    />
                </Field>
            </div>

            <Field label="Ambientación" help="Contexto, lugar o época donde transcurre la historia." error={errors.setting}>
                <textarea
                    value={data.setting}
                    onChange={(event) => setData('setting', event.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Ej.: Una colonia aislada sobre un planeta cubierto de polvo, décadas después del colapso."
                    className={inputClass}
                />
            </Field>

            <Field label="Objetivo del jugador" help="Qué debe intentar conseguir el jugador." error={errors.player_objective}>
                <textarea
                    value={data.player_objective}
                    onChange={(event) => setData('player_objective', event.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Ej.: Descubrir qué ocurrió con los fundadores y decidir qué verdad revelar."
                    className={inputClass}
                />
            </Field>

            <Field label="Tipo de narrativa" help={selectedType?.help} error={errors.narrative_type}>
                <select value={data.narrative_type} onChange={(event) => setData('narrative_type', event.target.value as NarrativeType)} className={inputClass}>
                    {narrativeTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                            {type.label}
                        </option>
                    ))}
                </select>
            </Field>
            <p className="text-xs text-zinc-500">
                {branchingEnabled
                    ? 'Este proyecto será compatible con el futuro panel de ramificaciones.'
                    : 'El futuro panel de ramificaciones no estará habilitado. Tus escenas y conexiones existentes se conservan si cambias de tipo.'}
            </p>

            <div className="flex items-center gap-3">
                <button type="submit" disabled={processing} className="border border-amber-600 px-4 py-2 text-sm text-amber-100 hover:bg-amber-950 disabled:opacity-50">
                    {processing ? 'Guardando...' : 'Guardar configuración'}
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
