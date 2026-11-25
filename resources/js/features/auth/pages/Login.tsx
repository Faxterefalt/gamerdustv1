import { __ } from '../../../shared/lib/i18n';
import { Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AuthShell, { AuthField, authButton, authInput, authLink, authLinks } from '../components/AuthShell';

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
        <AuthShell title={__('Log in')} description={__('Enter to continue with your projects.')}>
            <form onSubmit={submit} className="mt-8 space-y-5">
                <AuthField label={__('Email')} error={errors.email}>
                    <input inputMode="email" autoComplete="email" value={data.email} onChange={(event) => setData('email', event.target.value)} className={authInput} />
                </AuthField>

                <AuthField label={__('Password')} error={errors.password}>
                    <input type="password" autoComplete="current-password" value={data.password} onChange={(event) => setData('password', event.target.value)} className={authInput} />
                </AuthField>

                <label className="flex min-h-11 items-center gap-3 text-sm text-muted">
                    <input type="checkbox" className="size-5" checked={data.remember} onChange={(event) => setData('remember', event.target.checked)} />
                    {__('Remember me')}
                </label>

                <button type="submit" disabled={processing} className={authButton}>
                    {__('Log in')}
                </button>
            </form>

            <div className={authLinks}>
                <Link href="/register" className={authLink}>
                    {__('Create account')}
                </Link>
                <Link href="/forgot-password" className={authLink}>
                    {__('Forgot your password?')}
                </Link>
            </div>
        </AuthShell>
    );
}
