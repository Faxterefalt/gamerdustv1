import { __ } from '../../../shared/lib/i18n';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import LocaleSwitcher from '../../../layouts/components/LocaleSwitcher';
import type { PageProps } from '../../projects/projects.types';

export default function Login() {
    const { flash } = usePage<PageProps>().props;
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
        <main className="min-h-screen bg-background px-4 py-10 text-foreground">
            <Head title={__('Log in')} />
            <section className="mx-auto max-w-md border border-border bg-surface p-6">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-semibold text-foreground">Gamerdust</h1>
                    <LocaleSwitcher />
                </div>
                <p className="mt-2 text-sm text-muted">{__('Local access to the narrative workspace.')}</p>
                {flash?.success && (
                    <p role="status" className="mt-5 border border-success/50 bg-success/10 px-3 py-2 text-sm text-success">
                        {flash.success}
                    </p>
                )}

                <form onSubmit={submit} className="mt-6 space-y-4">
                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-foreground">{__('Email')}</span>
                        <input value={data.email} onChange={(event) => setData('email', event.target.value)} className={inputClass} />
                        {errors.email && <span className="mt-1 block text-sm text-danger">{errors.email}</span>}
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-foreground">{__('Password')}</span>
                        <input type="password" value={data.password} onChange={(event) => setData('password', event.target.value)} className={inputClass} />
                        {errors.password && <span className="mt-1 block text-sm text-danger">{errors.password}</span>}
                    </label>

                    <label className="flex items-center gap-2 text-sm text-muted">
                        <input type="checkbox" checked={data.remember} onChange={(event) => setData('remember', event.target.checked)} />
                        {__('Remember me')}
                    </label>

                    <button type="submit" disabled={processing} className="w-full border border-primary px-4 py-2 text-sm font-medium text-foreground hover:bg-primary/10 disabled:opacity-50">
                        {__('Log in')}
                    </button>
                </form>

                <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm text-muted">
                    <Link href="/register" className="text-primary hover:text-foreground">
                        {__('Create account')}
                    </Link>
                    <Link href="/forgot-password" className="text-primary hover:text-foreground">
                        {__('Forgot your password?')}
                    </Link>
                </div>
            </section>
        </main>
    );
}

const inputClass = 'w-full border border-border-strong bg-background px-3 py-2 text-sm text-foreground focus:border-primary';
