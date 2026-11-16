import { Head, router, useForm } from '@inertiajs/react';
import { ArrowDown, Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import Modal, { FormError, PageHeading, Pending } from '../../../shared/components/ui';
import { __ } from '../../../shared/lib/i18n';
import { card, field, primarySm, secondary } from '../../../shared/lib/styles';
import type { Project } from '../../projects/projects.types';
import { MECHANIC_KINDS, mechanicKindLabel, type Mechanic, type MechanicKind } from '../mechanics.types';

interface MechanicsProps {
    project: Project;
    mechanics: Mechanic[];
}

export default function Index({ project, mechanics }: MechanicsProps) {
    const [editing, setEditing] = useState<Mechanic | 'new' | null>(null);

    const destroy = (mechanic: Mechanic) => {
        if (confirm(__('Delete ":name"?', { name: mechanic.title }))) {
            router.delete(`/projects/${project.id}/mechanics/${mechanic.id}`, { preserveScroll: true });
        }
    };

    return (
        <ProjectLayout>
            <Head title={`${__('Mechanics')} - ${project.title}`} />
            <PageHeading
                title={__('Mechanics')}
                description={__('Connect what the player does with what your story feels.')}
                action={
                    <button type="button" className={primarySm} onClick={() => setEditing('new')}>
                        <Plus size={15} /> {__('New mechanic')}
                    </button>
                }
            />

            <div className="grid items-start gap-5 xl:grid-cols-2">
                {mechanics.map((mechanic) => (
                    <article key={mechanic.id} className={`${card} p-6`}>
                        <div className="flex items-center justify-between gap-3">
                            <span className="rounded border border-primary/20 bg-primary/5 px-2.5 py-1 font-mono text-[8px] uppercase tracking-wider text-primary">{mechanicKindLabel(mechanic.kind)}</span>
                            <span className="flex">
                                <button type="button" aria-label={__('Edit :name', { name: mechanic.title })} onClick={() => setEditing(mechanic)} className="rounded p-2 text-[#a9bc9c] hover:text-primary">
                                    <Pencil size={15} />
                                </button>
                                <button type="button" aria-label={__('Delete ":name"?', { name: mechanic.title })} onClick={() => destroy(mechanic)} className="rounded p-2 text-[#a9bc9c] hover:text-rose-300">
                                    <Trash2 size={15} />
                                </button>
                            </span>
                        </div>
                        <h2 className="mt-5 font-display text-xl">{mechanic.title}</h2>
                        <p className="mt-3 whitespace-pre-wrap text-xs leading-7 text-[#a5b89a]">{mechanic.description || __('No description yet.')}</p>
                        <div className="mt-6 rounded-lg border border-border bg-background/50 p-4">
                            <h3 className="font-mono text-[8px] tracking-wider text-[#95a989]">{__('ACTIVATION')}</h3>
                            <p className="mt-2 text-xs leading-6">{mechanic.activation || __('To be defined')}</p>
                            <ArrowDown size={14} className="my-3 text-primary" />
                            <h3 className="font-mono text-[8px] tracking-wider text-[#95a989]">{__('NARRATIVE CONSEQUENCE')}</h3>
                            <p className="mt-2 whitespace-pre-wrap text-xs leading-6">{mechanic.narrative_effect || __('To be defined')}</p>
                        </div>
                    </article>
                ))}
            </div>

            {!mechanics.length && (
                <div className={`${card} px-6 py-20 text-center`}>
                    <Settings2 size={32} className="mx-auto text-primary" />
                    <h2 className="mt-5 font-display text-xl">{__('Make every decision matter.')}</h2>
                    <p className="mt-3 text-xs leading-6 text-[#a4b698]">{__('Define your first mechanic and its narrative consequence.')}</p>
                    <button type="button" className={`${secondary} mt-6`} onClick={() => setEditing('new')}>
                        {__('Create the first mechanic')}
                    </button>
                </div>
            )}

            {editing && <MechanicModal projectId={project.id} mechanic={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
        </ProjectLayout>
    );
}

function MechanicModal({ projectId, mechanic, onClose }: { projectId: number; mechanic: Mechanic | null; onClose: () => void }) {
    const form = useForm({
        title: mechanic?.title ?? '',
        kind: (mechanic?.kind ?? 'decision') as MechanicKind,
        description: mechanic?.description ?? '',
        activation: mechanic?.activation ?? '',
        narrative_effect: mechanic?.narrative_effect ?? '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };

        if (mechanic) {
            form.put(`/projects/${projectId}/mechanics/${mechanic.id}`, options);
        } else {
            form.post(`/projects/${projectId}/mechanics`, options);
        }
    };

    const firstError = Object.values(form.errors)[0];

    return (
        <Modal
            title={mechanic ? __('Edit mechanic') : __('New mechanic')}
            wide
            onClose={() => {
                if (!form.processing) onClose();
            }}
        >
            <form onSubmit={submit}>
                <fieldset disabled={form.processing} className="space-y-5">
                    <label className="block text-xs">
                        {__('Title')}
                        <input required maxLength={100} value={form.data.title} onChange={(event) => form.setData('title', event.target.value)} className={field} />
                    </label>
                    <label className="block text-xs">
                        {__('Type')}
                        <select value={form.data.kind} onChange={(event) => form.setData('kind', event.target.value as MechanicKind)} className={field}>
                            {MECHANIC_KINDS.map((kind) => (
                                <option key={kind} value={kind}>
                                    {mechanicKindLabel(kind)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block text-xs">
                        {__('Description')}
                        <textarea maxLength={2000} rows={3} value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} className={field} />
                    </label>
                    <label className="block text-xs">
                        {__('Activation')}
                        <input
                            maxLength={300}
                            value={form.data.activation}
                            onChange={(event) => form.setData('activation', event.target.value)}
                            placeholder={__('Which player action triggers it?')}
                            className={field}
                        />
                    </label>
                    <label className="block text-xs">
                        {__('Narrative consequence')}
                        <textarea maxLength={1000} rows={3} value={form.data.narrative_effect} onChange={(event) => form.setData('narrative_effect', event.target.value)} className={field} />
                    </label>
                    <FormError error={firstError} />
                    <button type="submit" className={`${primarySm} w-full`}>
                        <Pending pending={form.processing}>{__('Save mechanic')}</Pending>
                    </button>
                </fieldset>
            </form>
        </Modal>
    );
}
