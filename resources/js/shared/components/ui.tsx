import { LoaderCircle, X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { __ } from '../lib/i18n';
import { iconButton } from '../lib/styles';

/**
 * Ventana modal accesible basada en <dialog>. Cierra con Escape o al pulsar el fondo.
 */
export default function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const element = ref.current!;
        element.showModal();
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            element.close();
            document.body.style.overflow = previous;
        };
    }, []);

    return (
        <dialog
            ref={ref}
            aria-label={title}
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
            className={`fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-32px)] overflow-y-auto rounded-xl border border-border bg-surface p-0 text-foreground backdrop:bg-scrim ${wide ? 'max-w-2xl' : 'max-w-md'}`}
        >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-surface py-3 pl-6 pr-3">
                <h2 className="text-lg font-bold">{title}</h2>
                <button type="button" onClick={onClose} aria-label={__('Close window')} className={iconButton}>
                    <X size={18} />
                </button>
            </div>
            <div className="p-6">{children}</div>
        </dialog>
    );
}

export function FormError({ error }: { error?: string | null }) {
    return error ? (
        <p role="alert" className="mt-4 rounded-md border border-danger/20 bg-danger/10 p-3 text-xs leading-6 text-danger">
            {error}
        </p>
    ) : null;
}

export function Pending({ pending, children }: { pending: boolean; children: ReactNode }) {
    return (
        <>
            {pending && <LoaderCircle size={14} className="animate-spin motion-reduce:animate-none" />}
            {children}
        </>
    );
}

/** Cabecera de página del estudio: título y una frase (sin eyebrow; la sección ya está en las migas). */
export function PageHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
    return (
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div className="min-w-0">
                <h1 className="text-3xl font-bold">{title}</h1>
                <p className="mt-2 max-w-[65ch] text-muted">{description}</p>
            </div>
            {action}
        </div>
    );
}
