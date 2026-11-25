import { __ } from '../../../shared/lib/i18n';
import { useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import type { Scene } from '../scenes.types';
import { fieldBlock, primarySm } from '../../../shared/lib/styles';

interface SceneFormProps {
    projectId: number;
    scene?: Scene;
    method?: 'post' | 'put';
    submitLabel: string;
}

export default function SceneForm({ projectId, scene, method = 'post', submitLabel }: SceneFormProps) {
    const { data, setData, post, put, processing, errors } = useForm({
        title: scene?.title ?? '',
        act: scene?.act ?? '',
        order: scene?.order?.toString() ?? '1',
        summary: scene?.summary ?? '',
        conflict: scene?.conflict ?? '',
        expected_emotion: scene?.expected_emotion ?? '',
        interest_level: scene?.interest_level?.toString() ?? '',
        scene_type: scene?.scene_type ?? '',
        player_decision: scene?.player_decision ?? '',
        consequence: scene?.consequence ?? '',
        estimated_cost: scene?.estimated_cost ?? '',
    });

    const action = scene ? `/projects/${projectId}/scenes/${scene.id}` : `/projects/${projectId}/scenes`;
    const submit = (event: FormEvent) => {
        event.preventDefault();
        method === 'put' ? put(action) : post(action);
    };

    return (
        <form onSubmit={submit} className="space-y-5 rounded-lg border border-border bg-surface p-5 sm:p-6">
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_120px]">
                <Field label={__('Title')} error={errors.title}>
                    <input value={data.title} onChange={(event) => setData('title', event.target.value)} className={inputClass} />
                </Field>
                <Field label={__('Act')} error={errors.act}>
                    <input value={data.act} maxLength={100} placeholder={__('Act 1 - The arrival')} onChange={(event) => setData('act', event.target.value)} className={inputClass} />
                </Field>
                <Field label={__('Order')} error={errors.order}>
                    <input type="number" min="1" value={data.order} onChange={(event) => setData('order', event.target.value)} className={inputClass} />
                </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Field label={__('Expected emotion')} error={errors.expected_emotion}>
                    <input value={data.expected_emotion} onChange={(event) => setData('expected_emotion', event.target.value)} className={inputClass} />
                </Field>
                <Field label={__('Interest level')} error={errors.interest_level}>
                    <input type="number" min="1" max="10" value={data.interest_level} onChange={(event) => setData('interest_level', event.target.value)} className={inputClass} />
                </Field>
                <Field label={__('Scene type')} error={errors.scene_type}>
                    <input value={data.scene_type} onChange={(event) => setData('scene_type', event.target.value)} className={inputClass} />
                </Field>
            </div>

            <Field label={__('Summary')} error={errors.summary}>
                <textarea value={data.summary} onChange={(event) => setData('summary', event.target.value)} rows={4} className={inputClass} />
            </Field>
            <Field label={__('Conflict')} error={errors.conflict}>
                <textarea value={data.conflict} onChange={(event) => setData('conflict', event.target.value)} rows={3} className={inputClass} />
            </Field>
            <Field label={__('Player decision')} error={errors.player_decision}>
                <textarea value={data.player_decision} onChange={(event) => setData('player_decision', event.target.value)} rows={3} className={inputClass} />
            </Field>
            <Field label={__('Consequence')} error={errors.consequence}>
                <textarea value={data.consequence} onChange={(event) => setData('consequence', event.target.value)} rows={3} className={inputClass} />
            </Field>

            <button type="submit" disabled={processing} className={primarySm}>
                {submitLabel}
            </button>
        </form>
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
