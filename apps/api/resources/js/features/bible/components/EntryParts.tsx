import { Link } from '@inertiajs/react';
import { Check, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { Pending } from '../../../shared/components/ui';
import { __ } from '../../../shared/lib/i18n';
import { button, secondary } from '../../../shared/lib/styles';

/** Texto de "no hay nada que vincular" con enlace a la sección donde crearlo. */
export function CreateIn({ text, href, section }: { text: string; href: string; section: string }) {
    return (
        <>
            {text} {__('You can create them in')}{' '}
            <Link className="text-primary underline" href={href}>
                {section}
            </Link>
            .
        </>
    );
}

/** Estado de la ficha en la cabecera del formulario. */
export function EntryStatus({ dirty, saved }: { dirty: boolean; saved: boolean }) {
    return (
        <span role="status" className="flex items-center gap-1.5 text-[10px] text-primary">
            {dirty ? (
                __('Unsaved changes')
            ) : saved ? (
                <>
                    <Check size={12} /> {__('Saved')}
                </>
            ) : (
                __('Bible sheet')
            )}
        </span>
    );
}

/** Pie del formulario: nota, Eliminar, Cancelar y Guardar. */
export function EntryFooter({
    note,
    canDelete,
    onDelete,
    onCancel,
    processing,
    saveLabel,
}: {
    note: string;
    canDelete: boolean;
    onDelete: () => void;
    onCancel: () => void;
    processing: boolean;
    saveLabel: string;
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
            <p className="flex items-center gap-2 text-[9px] text-[#99b18c]">
                <ShieldCheck size={13} /> {note}
            </p>
            <div className="flex flex-wrap gap-3">
                {canDelete && (
                    <button type="button" onClick={onDelete} className={`${secondary} hover:!border-rose-300/40 hover:!text-rose-300`}>
                        <Trash2 size={14} />
                        {__('Delete')}
                    </button>
                )}
                <button type="button" onClick={onCancel} className={secondary}>
                    {__('Cancel')}
                </button>
                <button type="submit" className={button}>
                    <Pending pending={processing}>
                        <Save size={14} />
                        {saveLabel}
                    </Pending>
                </button>
            </div>
        </div>
    );
}
