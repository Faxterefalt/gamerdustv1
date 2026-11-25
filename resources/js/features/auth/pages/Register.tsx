import { __ } from '../../../shared/lib/i18n';
import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import LocaleSwitcher from '../../../layouts/components/LocaleSwitcher';

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
        <main className="min-h-screen bg-background px-4 py-10 text-foreground">
            <Head title={__('Create account')} />
            <section className="mx-auto max-w-md border border-border bg-surface p-6">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-semibold text-foreground">{__('Create account')}</h1>
                    <LocaleSwitcher />
                </div>
                <p className="mt-2 text-sm text-muted">{__('Local sign-up to start organizing narrative projects.')}</p>

                <form onSubmit={submit} className="mt-6 space-y-4">
                    <Field label={__('Name')} error={errors.name}>
                        <input value={data.name} onChange={(event) => setData('name', event.target.value)} className={inputClass} />
                    </Field>
                    <Field label={__('Email')} error={errors.email}>
                        <input value={data.email} onChange={(event) => setData('email', event.target.value)} className={inputClass} />
                    </Field>
                    <Field label={__('Password')} error={errors.password}>
                        <input type="password" value={data.password} onChange={(event) => setData('password', event.target.value)} className={inputClass} />
                    </Field>
                    <Field label={__('Confirm password')} error={errors.password_confirmation}>
                        <input
                            type="password"
                            value={data.password_confirmation}
                            onChange={(event) => setData('password_confirmation', event.target.value)}
                            className={inputClass}
                        />
                    </Field>

                    <button type="submit" disabled={processing} className="w-full border border-primary px-4 py-2 text-sm font-medium text-foreground hover:bg-primary/10 disabled:opacity-50">
                        {__('Create account')}
                    </button>
                </form>

                <div className="mt-5 text-sm text-muted">
                    <Link href="/login" className="text-primary hover:text-foreground">
                        {__('I already have an account')}
                    </Link>
                </div>
            </section>
        </main>
    );
}

const inputClass = 'w-full border border-border-strong bg-background px-3 py-2 text-sm text-foreground focus:border-primary';

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-foreground">{label}</span>
            {children}
            {error && <span className="mt-1 block text-sm text-danger">{error}</span>}
        </label>
    );
}
