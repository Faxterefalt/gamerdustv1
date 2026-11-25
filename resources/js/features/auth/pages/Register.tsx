import { __ } from '../../../shared/lib/i18n';
import { Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AuthShell, { AuthField, authButton, authInput, authLink, authLinks } from '../components/AuthShell';

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
        <AuthShell title={__('Create account')} description={__('Create your account to start your first project.')}>
            <form onSubmit={submit} className="mt-8 space-y-5">
                <AuthField label={__('Name')} error={errors.name}>
                    <input autoComplete="name" value={data.name} onChange={(event) => setData('name', event.target.value)} className={authInput} />
                </AuthField>
                <AuthField label={__('Email')} error={errors.email}>
                    <input inputMode="email" autoComplete="email" value={data.email} onChange={(event) => setData('email', event.target.value)} className={authInput} />
                </AuthField>
                <AuthField label={__('Password')} error={errors.password}>
                    <input type="password" autoComplete="new-password" value={data.password} onChange={(event) => setData('password', event.target.value)} className={authInput} />
                </AuthField>
                <AuthField label={__('Confirm password')} error={errors.password_confirmation}>
                    <input
                        type="password"
                        autoComplete="new-password"
                        value={data.password_confirmation}
                        onChange={(event) => setData('password_confirmation', event.target.value)}
                        className={authInput}
                    />
                </AuthField>

                <button type="submit" disabled={processing} className={authButton}>
                    {__('Create account')}
                </button>
            </form>

            <div className={authLinks}>
                <Link href="/login" className={authLink}>
                    {__('I already have an account')}
                </Link>
            </div>
        </AuthShell>
    );
}
