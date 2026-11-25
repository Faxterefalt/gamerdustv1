import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import Modal, { FormError } from '../../../shared/components/ui';
import { __ } from '../../../shared/lib/i18n';
import { field, primarySm, secondary } from '../../../shared/lib/styles';
import type { BranchingVariable, SaveResponse, VariableDraft, VariableType } from '../branching.types';
import type { SaveError } from '../hooks/useBranchingGraph';
import { ValueInput } from './OptionLogicEditor';

interface VariablesDialogProps {
    variables: BranchingVariable[];
    error: SaveError | null;
    onSave: (id: number | null, data: VariableDraft) => Promise<SaveResponse | null>;
    onDelete: (id: number) => Promise<SaveResponse | null>;
    onClose: () => void;
}

const TYPE_LABEL: Record<VariableType, string> = { bool: 'True / false', number: 'Number' };

const empty: VariableDraft = { key: '', type: 'number', initial_value: 0, description: '' };

/**
 * Variables del recorrido (HU 19). Las condiciones y efectos de las opciones las usan por su clave;
 * renombrar una clave la reescribe en todas las opciones.
 */
export default function VariablesDialog({ variables, error, onSave, onDelete, onClose }: VariablesDialogProps) {
    const [editing, setEditing] = useState<number | 'new' | null>(variables.length ? null : 'new');
    const [draft, setDraft] = useState<VariableDraft>(empty);
    const [pending, setPending] = useState(false);

    const open = (variable: BranchingVariable | null) => {
        setEditing(variable ? variable.id : 'new');
        setDraft(variable ? { key: variable.key, type: variable.type, initial_value: variable.initial_value, description: variable.description ?? '' } : empty);
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setPending(true);
        const response = await onSave(editing === 'new' ? null : (editing as number), { ...draft, description: draft.description || null });
        setPending(false);

        if (response) {
            setEditing(null);
        }
    };

    const remove = async (variable: BranchingVariable) => {
        if (confirm(__('Delete the variable ":key"?', { key: variable.key }))) {
            await onDelete(variable.id);
        }
    };

    const fieldError = (name: string) => error?.fields[name]?.[0];

    return (
        <Modal title={__('Variables')} onClose={onClose} wide>
            <p className="mb-5 text-xs leading-6 text-muted">
                {__('Variables store the state of a playthrough (trust, items, decisions). Options can require them and change them; try it with "Test run".')}
            </p>

            <ul className="space-y-2">
                {variables.map((variable) => (
                    <li key={variable.id} className="flex items-center gap-3 rounded-md border border-border p-3 text-xs">
                        <code className="text-sm text-primary">{variable.key}</code>
                        <span className="text-muted">{__(TYPE_LABEL[variable.type])}</span>
                        <span className="">
                            {__('starts at')} {typeof variable.initial_value === 'boolean' ? __(variable.initial_value ? 'true' : 'false') : variable.initial_value}
                        </span>
                        {variable.description && <span className="min-w-0 flex-1 truncate text-muted">{variable.description}</span>}
                        <span className="ml-auto flex gap-1">
                            <button type="button" aria-label={__('Edit :key', { key: variable.key })} onClick={() => open(variable)} className="rounded p-1.5 hover:bg-surface-2">
                                <Pencil size={13} />
                            </button>
                            <button type="button" aria-label={__('Delete :key', { key: variable.key })} onClick={() => void remove(variable)} className="rounded p-1.5 hover:bg-surface-2 hover:text-danger">
                                <Trash2 size={13} />
                            </button>
                        </span>
                    </li>
                ))}
            </ul>
            {!variables.length && editing === null && <p className="text-xs text-muted">{__('There are no variables yet.')}</p>}

            {editing === null ? (
                <button type="button" onClick={() => open(null)} className={`${secondary} mt-4 w-full border-dashed`}>
                    <Plus size={14} /> {__('New variable')}
                </button>
            ) : (
                <form onSubmit={submit} className="mt-5 space-y-4 rounded-lg border border-border p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-xs">
                            {__('Key')}
                            <input
                                required
                                maxLength={64}
                                value={draft.key}
                                onChange={(event) => setDraft({ ...draft, key: event.target.value })}
                                placeholder={__('E.g.: trust')}
                                className={`${field} `}
                            />
                            {fieldError('key') && <span className="mt-1 block text-danger">{fieldError('key')}</span>}
                        </label>
                        <label className="block text-xs">
                            {__('Type')}
                            <select
                                value={draft.type}
                                onChange={(event) => {
                                    const type = event.target.value as VariableType;
                                    setDraft({ ...draft, type, initial_value: type === 'bool' ? false : 0 });
                                }}
                                className={field}
                            >
                                {(Object.keys(TYPE_LABEL) as VariableType[]).map((type) => (
                                    <option key={type} value={type}>
                                        {__(TYPE_LABEL[type])}
                                    </option>
                                ))}
                            </select>
                            {fieldError('type') && <span className="mt-1 block text-danger">{fieldError('type')}</span>}
                        </label>
                    </div>
                    <div className="text-xs">
                        <span className="mb-2 block">{__('Initial value')}</span>
                        <ValueInput variable={draft} value={draft.initial_value} onChange={(value) => setDraft({ ...draft, initial_value: value })} />
                        {fieldError('initial_value') && <span className="mt-1 block text-danger">{fieldError('initial_value')}</span>}
                    </div>
                    <label className="block text-xs">
                        {__('Description')}
                        <input maxLength={500} value={draft.description ?? ''} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={field} />
                    </label>
                    {error && !Object.keys(error.fields).some((name) => ['key', 'type', 'initial_value'].includes(name)) && <FormError error={error.message} />}
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setEditing(null)} className={secondary}>
                            {__('Cancel')}
                        </button>
                        <button type="submit" disabled={pending} className={primarySm}>
                            {__('Save variable')}
                        </button>
                    </div>
                </form>
            )}
            {editing === null && error?.fields.variable && <FormError error={error.fields.variable[0]} />}
        </Modal>
    );
}
