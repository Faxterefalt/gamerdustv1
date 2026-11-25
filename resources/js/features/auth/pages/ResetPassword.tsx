import { Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { __ } from '../../../shared/lib/i18n';
import AuthShell, { AuthField, authButton, authInput } from '../components/AuthShell';

interface ResetPasswordProps {
    token: string;
    email: string;
}

export default function ResetPassword({ token, email }: ResetPasswordProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        post('/reset-password', { onFinish: () => reset('password', 'password_confirmation') });
    };

    return (
        <AuthShell title={__('Choose a new password')} description={__('The link is valid for 60 minutes and can only be used once.')}>
            <form onSubmit={submit} className="mt-6 space-y-4">
                <AuthField label={__('Email')} error={errors.email}>
                    <input type="email" autoComplete="email" required value={data.email} onChange={(event) => setData('email', event.target.value)} className={authInput} />
                </AuthField>
                <AuthField label={__('New password')} error={errors.password}>
                    <input type="password" autoComplete="new-password" required value={data.password} onChange={(event) => setData('password', event.target.value)} className={authInput} />
                </AuthField>
                <AuthField label={__('Confirm password')} error={errors.password_confirmation}>
                    <input
                        type="password"
                        autoComplete="new-password"
                        required
                        value={data.password_confirmation}
                        onChange={(event) => setData('password_confirmation', event.target.value)}
                        className={authInput}
                    />
                </AuthField>
                {errors.token && <p className="text-sm text-danger">{errors.token}</p>}
                <button type="submit" disabled={processing} className={authButton}>
                    {__('Reset password')}
                </button>
            </form>
            <div className="mt-5 text-sm text-muted">
                <Link href="/forgot-password" className="text-primary hover:text-foreground">
                    {__('Request a new link')}
                </Link>
            </div>
        </AuthShell>
    );
}
