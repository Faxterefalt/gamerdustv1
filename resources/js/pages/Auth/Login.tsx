import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: 'test@example.com',
        password: 'password',
        remember: true,
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        post('/login');
    };

    return (
        <main className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
            <Head title="Ingresar" />
            <section className="mx-auto max-w-md border border-zinc-800 bg-zinc-900 p-6">
                <h1 className="text-2xl font-semibold text-white">Gamerdust</h1>
                <p className="mt-2 text-sm text-zinc-400">Acceso local al espacio narrativo.</p>

                <form onSubmit={submit} className="mt-6 space-y-4">
                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-zinc-200">Email</span>
                        <input value={data.email} onChange={(event) => setData('email', event.target.value)} className={inputClass} />
                        {errors.email && <span className="mt-1 block text-sm text-rose-300">{errors.email}</span>}
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-zinc-200">Password</span>
                        <input type="password" value={data.password} onChange={(event) => setData('password', event.target.value)} className={inputClass} />
                        {errors.password && <span className="mt-1 block text-sm text-rose-300">{errors.password}</span>}
                    </label>

                    <label className="flex items-center gap-2 text-sm text-zinc-300">
                        <input type="checkbox" checked={data.remember} onChange={(event) => setData('remember', event.target.checked)} />
                        Recordar sesion
                    </label>

                    <button type="submit" disabled={processing} className="w-full border border-amber-600 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-950 disabled:opacity-50">
                        Ingresar
                    </button>
                </form>

                <div className="mt-5 text-sm text-zinc-400">
                    <Link href="/register" className="text-amber-200 hover:text-amber-100">
                        Crear cuenta
                    </Link>
                </div>
            </section>
        </main>
    );
}

const inputClass = 'w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500';
