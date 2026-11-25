import { useState, type FormEvent } from 'react';
import Modal, { FormError, Pending } from '../../../shared/components/ui';
import { api, ApiError } from '../../../shared/lib/api';
import { __ } from '../../../shared/lib/i18n';
import { field, primarySm } from '../../../shared/lib/styles';
import type { ScriptScene } from '../script.types';

interface SceneDialogProps {
    projectId: number;
    act: string;
    onClose: () => void;
    onCreated: (scene: ScriptScene) => void;
}

export default function SceneDialog({ projectId, act, onClose, onCreated }: SceneDialogProps) {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setPending(true);
        setError('');

        try {
            const response = await api<{ scene: ScriptScene }>('POST', `/projects/${projectId}/script/scenes`, {
                title: String(form.get('title') || ''),
                act: String(form.get('act') || ''),
            });
            onCreated(response.scene);
            onClose();
        } catch (caught) {
            setError(caught instanceof ApiError ? (Object.values(caught.errors)[0]?.[0] ?? caught.message) : __('Could not save. Check your connection.'));
        } finally {
            setPending(false);
        }
    };

    return (
        <Modal
            title={__('Add scene')}
            onClose={() => {
                if (!pending) onClose();
            }}
        >
            <form onSubmit={submit}>
                <fieldset disabled={pending}>
                    <label className="block text-xs">
                        {__('Scene title')}
                        <input name="title" required maxLength={255} placeholder={__('E.g. The forest answers')} className={field} />
                    </label>
                    <label className="mt-5 block text-xs">
                        {__('Act')}
                        <input name="act" required maxLength={100} defaultValue={act || __('Act 1 - The arrival')} className={field} />
                    </label>
                    <p className="mt-4 text-xs leading-6 text-muted">{__('The scene will be added at the end of the sequence. Its script will start with an editable heading.')}</p>
                    <FormError error={error} />
                    <button type="submit" className={`${primarySm} mt-6 w-full`}>
                        <Pending pending={pending}>{__('Create scene')}</Pending>
                    </button>
                </fieldset>
            </form>
        </Modal>
    );
}
