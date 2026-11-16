import { LoaderCircle, X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { __ } from '../lib/i18n';

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
            className={`fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-32px)] overflow-y-auto rounded-xl border border-border bg-[#172018] p-0 text-foreground shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm ${wide ? 'max-w-2xl' : 'max-w-md'}`}
        >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-[#172018] px-6 py-5">
                <h2 className="font-display text-lg">{title}</h2>
                <button type="button" onClick={onClose} aria-label={__('Close window')} className="rounded p-2 text-[#aebea3] hover:bg-white/5">
                    <X size={18} />
                </button>
            </div>
            <div className="p-6">{children}</div>
        </dialog>
    );
}

export function FormError({ error }: { error?: string | null }) {
    return error ? (
        <p role="alert" className="mt-4 rounded-md border border-red-300/20 bg-red-300/5 p-3 text-xs leading-6 text-[#f3baa5]">
            {error}
        </p>
    ) : null;
}

export function Pending({ pending, children }: { pending: boolean; children: ReactNode }) {
    return (
        <>
            {pending && <LoaderCircle size={14} className="animate-spin" />}
            {children}
        </>
    );
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
    return (
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div>
                <p className="font-mono text-[9px] tracking-[.16em] text-[#97a78a]">{eyebrow ?? __('THE STUDIO / YOUR STORY')}</p>
                <h1 className="mt-3 font-display text-[30px] font-medium tracking-[-.035em] sm:text-[34px]">{title}</h1>
                <p className="mt-2 max-w-2xl text-xs leading-6 text-[#9eae94]">{description}</p>
            </div>
            {action}
        </div>
    );
}
