import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';

export default function Register() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        post('/register');
    };

    return (
        <main className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
            <Head title="Crear cuenta" />
            <section className="mx-auto max-w-md border border-zinc-800 bg-zinc-900 p-6">
                <h1 className="text-2xl font-semibold text-white">Crear cuenta</h1>
                <p className="mt-2 text-sm text-zinc-400">Registro local para comenzar a organizar proyectos narrativos.</p>

                <form onSubmit={submit} className="mt-6 space-y-4">
                    <Field label="Nombre" error={errors.name}>
                        <input value={data.name} onChange={(event) => setData('name', event.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Email" error={errors.email}>
                        <input value={data.email} onChange={(event) => setData('email', event.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Password" error={errors.password}>
                        <input type="password" value={data.password} onChange={(event) => setData('password', event.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Confirmar password" error={errors.password_confirmation}>
                        <input
                            type="password"
                            value={data.password_confirmation}
                            onChange={(event) => setData('password_confirmation', event.target.value)}
                            className={inputClass}
                        />
                    </Field>

                    <button type="submit" disabled={processing} className="w-full border border-amber-600 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-950 disabled:opacity-50">
                        Crear cuenta
                    </button>
                </form>

                <div className="mt-5 text-sm text-zinc-400">
                    <Link href="/login" className="text-amber-200 hover:text-amber-100">
                        Ya tengo cuenta
                    </Link>
                </div>
            </section>
        </main>
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
