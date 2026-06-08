import { Head, useForm, usePage } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import AppShell from '../../components/gamerdust/AppShell';
import type { PageProps } from '../../types/project';

export default function Edit() {
    const { props } = usePage<PageProps>();
    const user = props.auth.user;

    const profileForm = useForm({
        name: user?.name ?? '',
        email: user?.email ?? '',
    });

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submitProfile = (event: FormEvent) => {
        event.preventDefault();
        profileForm.put('/account/profile', { preserveScroll: true });
    };

    const submitPassword = (event: FormEvent) => {
        event.preventDefault();
        passwordForm.put('/account/password', {
            preserveScroll: true,
            onSuccess: () => passwordForm.reset('current_password', 'password', 'password_confirmation'),
        });
    };

    return (
        <AppShell title="Cuenta">
            <Head title="Cuenta" />

            <div className="grid gap-6 lg:grid-cols-2">
                <section className="border border-zinc-800 bg-zinc-900 p-5">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Perfil</h2>
                        <p className="mt-1 text-sm text-zinc-400">Actualiza el nombre visible y el correo de acceso.</p>
                    </div>

                    <form onSubmit={submitProfile} className="mt-5 space-y-4">
                        <Field label="Nombre" error={profileForm.errors.name}>
                            <input value={profileForm.data.name} onChange={(event) => profileForm.setData('name', event.target.value)} className={inputClass} />
                        </Field>
                        <Field label="Correo" error={profileForm.errors.email}>
                            <input type="email" value={profileForm.data.email} onChange={(event) => profileForm.setData('email', event.target.value)} className={inputClass} />
                        </Field>

                        <button
                            type="submit"
                            disabled={profileForm.processing}
                            className="border border-amber-600 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-950 disabled:opacity-50"
                        >
                            Guardar perfil
                        </button>
                    </form>
                </section>

                <section className="border border-zinc-800 bg-zinc-900 p-5">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Password</h2>
                        <p className="mt-1 text-sm text-zinc-400">Confirma tu password actual antes de guardar uno nuevo.</p>
                    </div>

                    <form onSubmit={submitPassword} className="mt-5 space-y-4">
                        <Field label="Password actual" error={passwordForm.errors.current_password}>
                            <input
                                type="password"
                                value={passwordForm.data.current_password}
                                onChange={(event) => passwordForm.setData('current_password', event.target.value)}
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Nuevo password" error={passwordForm.errors.password}>
                            <input type="password" value={passwordForm.data.password} onChange={(event) => passwordForm.setData('password', event.target.value)} className={inputClass} />
                        </Field>
                        <Field label="Confirmar nuevo password" error={passwordForm.errors.password_confirmation}>
                            <input
                                type="password"
                                value={passwordForm.data.password_confirmation}
                                onChange={(event) => passwordForm.setData('password_confirmation', event.target.value)}
                                className={inputClass}
                            />
                        </Field>

                        <button
                            type="submit"
                            disabled={passwordForm.processing}
                            className="border border-amber-600 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-950 disabled:opacity-50"
                        >
                            Cambiar password
                        </button>
                    </form>
                </section>
            </div>
        </AppShell>
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
