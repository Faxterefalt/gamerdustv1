import { router, useForm, usePage } from '@inertiajs/react';
import { LogOut, Trash2, UserPlus, Users } from 'lucide-react';
import type { FormEvent } from 'react';
import { FormError, Pending } from '../../../shared/components/ui';
import useProjectAccess from '../../../shared/hooks/useProjectAccess';
import { __ } from '../../../shared/lib/i18n';
import { card, field, iconButton, primarySm } from '../../../shared/lib/styles';
import type { PageProps } from '../../projects/projects.types';
import type { MemberRole, ProjectMemberRow } from '../collaboration.types';

// Claves de traducción de cada rol y lo que permite.
export const ROLE_LABELS: Record<ProjectMemberRow['role'], string> = { owner: 'Owner', admin: 'Administrator', editor: 'Editor', viewer: 'Reader' };

const ROLE_HELP: Record<MemberRole, string> = {
    admin: 'Reads, writes and manages members.',
    editor: 'Reads and writes.',
    viewer: 'Only reads: cannot change anything.',
};

interface MembersPanelProps {
    projectId: number;
    members: ProjectMemberRow[];
    roles: MemberRole[];
}

/** Miembros del proyecto (HU 5): invitar por correo, cambiar el rol, retirar o salir. */
export default function MembersPanel({ projectId, members, roles }: MembersPanelProps) {
    const access = useProjectAccess();
    const userId = usePage<PageProps>().props.auth.user?.id;
    const form = useForm<{ email: string; role: MemberRole }>({ email: '', role: 'editor' });
    const base = `/projects/${projectId}/members`;
    const keep = { preserveScroll: true };

    const invite = (event: FormEvent) => {
        event.preventDefault();
        form.post(base, { ...keep, onSuccess: () => form.reset('email') });
    };

    const changeRole = (member: ProjectMemberRow, role: MemberRole) => router.put(`${base}/${member.id}`, { role }, keep);

    const remove = (member: ProjectMemberRow) => {
        const self = member.user_id === userId;
        const question = self
            ? __('Leave this project? You will lose access to it.')
            : __('Remove :name from the project? They will lose access immediately.', { name: member.name ?? '' });

        if (confirm(question)) {
            router.delete(`${base}/${member.id}`, keep);
        }
    };

    return (
        <div className={`${card} p-6`}>
            <h2 className="flex items-center gap-2 font-display text-lg">
                <Users size={18} className="text-primary" /> {__('Team')}
            </h2>
            <p className="mt-2 text-xs leading-6 text-muted">{__('Invite people who already have a Gamerdust account. Each role decides what they can do.')}</p>

            <ul className="mt-5 space-y-3">
                {members.map((member) => {
                    const self = member.user_id === userId;

                    return (
                        <li key={member.id ?? 'owner'} className="rounded-lg border border-border bg-background/30 p-3">
                            <div className="flex items-start gap-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                                    {(member.name ?? '?').slice(0, 2).toUpperCase()}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="break-words text-xs font-medium">
                                        {member.name} {self && <span className="text-xs text-muted">({__('you')})</span>}
                                    </p>
                                    <p className="break-all text-xs text-subtle">{member.email}</p>
                                </div>
                                {member.id !== null && (access.can_manage || self) && (
                                    <button
                                        type="button"
                                        onClick={() => remove(member)}
                                        aria-label={self ? __('Leave project') : __('Remove :name', { name: member.name ?? '' })}
                                        title={self ? __('Leave project') : __('Remove from the project')}
                                        className={`${iconButton} hover:text-danger`}
                                    >
                                        {self ? <LogOut size={13} /> : <Trash2 size={13} />}
                                    </button>
                                )}
                            </div>
                            <div className="mt-2">
                                {member.role === 'owner' || !access.can_manage ? (
                                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">{__(ROLE_LABELS[member.role])}</span>
                                ) : (
                                    <label className="block text-xs text-muted">
                                        <span className="sr-only">{__('Role of :name', { name: member.name ?? '' })}</span>
                                        <select
                                            value={member.role}
                                            onChange={(event) => changeRole(member, event.target.value as MemberRole)}
                                            className={`${field} !py-1 !text-xs`}
                                        >
                                            {roles.map((role) => (
                                                <option key={role} value={role}>
                                                    {__(ROLE_LABELS[role])}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>

            {access.can_manage && (
                <form onSubmit={invite} className="mt-6 border-t border-border pt-5">
                    <fieldset disabled={form.processing} className="space-y-3">
                        <label className="block text-xs text-muted">
                            {__('Email')}
                            <input
                                type="email"
                                required
                                value={form.data.email}
                                onChange={(event) => form.setData('email', event.target.value)}
                                placeholder={__('name@example.com')}
                                className={`${field} !text-xs`}
                            />
                        </label>
                        <FormError error={form.errors.email} />
                        <label className="block text-xs text-muted">
                            {__('Role')}
                            <select value={form.data.role} onChange={(event) => form.setData('role', event.target.value as MemberRole)} className={`${field} !text-xs`}>
                                {roles.map((role) => (
                                    <option key={role} value={role}>
                                        {__(ROLE_LABELS[role])}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <p className="text-xs text-muted">{__(ROLE_HELP[form.data.role])}</p>
                        <FormError error={form.errors.role} />
                        <button type="submit" className={`${primarySm} w-full`}>
                            <Pending pending={form.processing}>
                                <UserPlus size={13} /> {__('Invite')}
                            </Pending>
                        </button>
                    </fieldset>
                </form>
            )}
        </div>
    );
}
