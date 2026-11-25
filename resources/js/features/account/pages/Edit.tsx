import { __ } from '../../../shared/lib/i18n';
import { Head, useForm, usePage } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import type { PageProps } from '../../projects/projects.types';
import { fieldBlock, primarySm } from '../../../shared/lib/styles';

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
        <ProjectLayout title={__('Account')}>
            <Head title={__('Account')} />

            <div className="grid gap-6 lg:grid-cols-2">
                <section className="border border-border bg-surface p-5">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">{__('Profile')}</h2>
                        <p className="mt-1 text-sm text-muted">{__('Update your display name and login email.')}</p>
                    </div>

                    <form onSubmit={submitProfile} className="mt-5 space-y-4">
                        <Field label={__('Name')} error={profileForm.errors.name}>
                            <input value={profileForm.data.name} onChange={(event) => profileForm.setData('name', event.target.value)} className={inputClass} />
                        </Field>
                        <Field label={__('Email')} error={profileForm.errors.email}>
                            <input type="email" value={profileForm.data.email} onChange={(event) => profileForm.setData('email', event.target.value)} className={inputClass} />
                        </Field>

                        <button
                            type="submit"
                            disabled={profileForm.processing}
                            className={primarySm}
                        >
                            {__('Save profile')}
                        </button>
                    </form>
                </section>

                <section className="border border-border bg-surface p-5">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">{__('Password')}</h2>
                        <p className="mt-1 text-sm text-muted">{__('Confirm your current password before saving a new one.')}</p>
                    </div>

                    <form onSubmit={submitPassword} className="mt-5 space-y-4">
                        <Field label={__('Current password')} error={passwordForm.errors.current_password}>
                            <input
                                type="password"
                                value={passwordForm.data.current_password}
                                onChange={(event) => passwordForm.setData('current_password', event.target.value)}
                                className={inputClass}
                            />
                        </Field>
                        <Field label={__('New password')} error={passwordForm.errors.password}>
                            <input type="password" value={passwordForm.data.password} onChange={(event) => passwordForm.setData('password', event.target.value)} className={inputClass} />
                        </Field>
                        <Field label={__('Confirm new password')} error={passwordForm.errors.password_confirmation}>
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
                            className={primarySm}
                        >
                            {__('Change password')}
                        </button>
                    </form>
                </section>
            </div>
        </ProjectLayout>
    );
}

const inputClass = fieldBlock;

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-foreground">{label}</span>
            {children}
            {error && <span className="mt-1 block text-sm text-danger">{error}</span>}
        </label>
    );
}
