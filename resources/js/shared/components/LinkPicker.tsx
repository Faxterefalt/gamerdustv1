import { Check, Search } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { __ } from '../lib/i18n';
import { button } from '../lib/styles';

export interface LinkOption {
    id: number;
    label: string;
    /** Aviso bajo la opción (p. ej. "Ahora en: Mercado"). */
    hint?: string | null;
}

/**
 * Lista de casillas para vincular referencias (escenas, personajes, lugares...) dentro de un Modal.
 * Los cambios se aplican al borrador al momento; se guardan con el formulario.
 */
export default function LinkPicker({
    options,
    checked,
    onToggle,
    onDone,
    empty,
    note,
}: {
    options: LinkOption[];
    checked: number[];
    onToggle: (id: number, on: boolean) => void;
    onDone: () => void;
    /** Texto si no hay nada que vincular (suele enlazar a la sección donde crearlo). */
    empty: ReactNode;
    /** Recordatorio de que hay que guardar el formulario. */
    note: string;
}) {
    const [query, setQuery] = useState('');
    const needle = query.trim().toLocaleLowerCase();
    const visible = options.filter((option) => option.label.toLocaleLowerCase().includes(needle));

    return (
        <>
            {options.length > 6 && (
                <label className="mb-4 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2.5">
                    <Search size={14} className="shrink-0 text-muted" />
                    <input aria-label={__('Filter')} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={__('Filter…')} className="w-full min-w-0 bg-transparent text-xs" />
                </label>
            )}
            <div className="space-y-2">
                {visible.map((option) => (
                    <label key={option.id} className="flex items-start gap-3 rounded-md border border-border p-3 text-xs leading-6">
                        <input type="checkbox" checked={checked.includes(option.id)} onChange={(event) => onToggle(option.id, event.target.checked)} className="mt-1.5 accent-primary" />
                        <span className="min-w-0">
                            <span className="block break-words">{option.label}</span>
                            {option.hint && <span className="block text-xs leading-5 text-warning">{option.hint}</span>}
                        </span>
                    </label>
                ))}
            </div>
            {!options.length && <p className="text-xs leading-7 text-muted">{empty}</p>}
            {options.length > 0 && !visible.length && <p className="text-xs leading-7 text-muted">{__('No matches.')}</p>}
            <button type="button" onClick={onDone} className={`${button} mt-6 w-full`}>
                <Check size={14} />
                {__('Done')}
            </button>
            <p className="mt-3 text-xs leading-6 text-muted">{note}</p>
        </>
    );
}
