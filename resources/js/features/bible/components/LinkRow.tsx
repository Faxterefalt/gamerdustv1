import { Plus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { __ } from '../../../shared/lib/i18n';
import { secondary } from '../../../shared/lib/styles';

export interface LinkChip {
    id: number;
    /** null si la referencia ya no existe. */
    label: string | null;
}

/**
 * Fila del bloque "Vínculos narrativos": etiqueta, chips con botón de desvincular y botón para añadir.
 */
export default function LinkRow({
    label,
    items,
    onRemove,
    addLabel,
    onAdd,
    extra,
    note,
}: {
    label: string;
    items: LinkChip[];
    onRemove: (id: number) => void;
    addLabel: string;
    onAdd: () => void;
    /** Control adicional dentro del chip (p. ej. la relación del personaje con la regla). */
    extra?: (id: number, label: string) => ReactNode;
    note?: string;
}) {
    return (
        <div className="grid items-start gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
            <div className="pt-2">
                <h4 className="text-xs text-muted">{label}</h4>
                {note && <p className="mt-1 text-xs leading-4 text-muted">{note}</p>}
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
                {items.map(({ id, label: chip }) => {
                    const text = chip ?? __('Reference unavailable');

                    return (
                        <span key={id} className="inline-flex max-w-full items-center gap-2 rounded-md border border-primary/20 bg-primary/[.07] px-2.5 py-2 text-xs text-muted">
                            <span className="min-w-0 break-words">{text}</span>
                            {extra?.(id, text)}
                            <button type="button" aria-label={__('Unlink :name', { name: text })} onClick={() => onRemove(id)} className="shrink-0 text-primary hover:text-primary">
                                <X size={12} />
                            </button>
                        </span>
                    );
                })}
                <button type="button" onClick={onAdd} className={`${secondary} !min-h-8 border-dashed !px-2.5 !py-1.5 !text-xs`}>
                    <Plus size={12} /> {addLabel}
                </button>
            </div>
        </div>
    );
}
