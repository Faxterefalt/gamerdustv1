import { Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { __ } from '../../../shared/lib/i18n';
import AuthShell, { AuthField, authButton, authInput } from '../components/AuthShell';

export default function ForgotPassword() {
    const { data, setData, post, processing, errors } = useForm({ email: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        post('/forgot-password', { preserveScroll: true });
    };

    return (
        <AuthShell title={__('Forgot your password?')} description={__('Enter your email and we will send you a link to choose a new password.')}>
            <form onSubmit={submit} className="mt-6 space-y-4">
                <AuthField label={__('Email')} error={errors.email}>
                    <input type="email" autoComplete="email" required value={data.email} onChange={(event) => setData('email', event.target.value)} className={authInput} />
                </AuthField>
                <button type="submit" disabled={processing} className={authButton}>
                    {__('Send reset link')}
                </button>
            </form>
            <div className="mt-5 text-sm text-zinc-400">
                <Link href="/login" className="text-amber-200 hover:text-amber-100">
                    {__('Back to log in')}
                </Link>
            </div>
        </AuthShell>
    );
}
