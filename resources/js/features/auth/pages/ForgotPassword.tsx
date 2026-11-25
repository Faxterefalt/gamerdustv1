import { Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { __ } from '../../../shared/lib/i18n';
import AuthShell, { AuthField, authButton, authInput, authLink, authLinks } from '../components/AuthShell';

export default function ForgotPassword() {
    const { data, setData, post, processing, errors } = useForm({ email: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        post('/forgot-password', { preserveScroll: true });
    };

    return (
        <AuthShell title={__('Forgot your password?')} description={__('Enter your email and we will send you a link to choose a new password.')}>
            <form onSubmit={submit} className="mt-8 space-y-5">
                <AuthField label={__('Email')} error={errors.email}>
                    <input type="email" autoComplete="email" required value={data.email} onChange={(event) => setData('email', event.target.value)} className={authInput} />
                </AuthField>
                <button type="submit" disabled={processing} className={authButton}>
                    {__('Send reset link')}
                </button>
            </form>
            <div className={authLinks}>
                <Link href="/login" className={authLink}>
                    {__('Back to log in')}
                </Link>
            </div>
        </AuthShell>
    );
}
