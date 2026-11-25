import { ImagePlus, Upload } from 'lucide-react';
import { useEffect, useMemo, type ChangeEvent } from 'react';
import { __ } from '../../../shared/lib/i18n';
import { secondary } from '../../../shared/lib/styles';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Concept art de una ficha: vista previa, subir/cambiar y quitar. El archivo se envía con el formulario.
 */
export default function ImageField({
    file,
    currentUrl,
    removed,
    alt,
    onPick,
    onRemove,
    onTooLarge,
}: {
    /** Archivo elegido y aún no guardado. */
    file: File | null;
    /** Imagen ya guardada (null si no hay). */
    currentUrl: string | null;
    /** El usuario ha quitado la imagen guardada. */
    removed: boolean;
    alt: string;
    onPick: (file: File) => void;
    onRemove: () => void;
    onTooLarge: () => void;
}) {
    const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
    useEffect(
        () => () => {
            if (preview) URL.revokeObjectURL(preview);
        },
        [preview],
    );
    const src = preview ?? (removed ? null : currentUrl);

    const pick = (event: ChangeEvent<HTMLInputElement>) => {
        const picked = event.target.files?.[0] ?? null;
        // Permite volver a elegir el mismo archivo.
        event.target.value = '';
        if (!picked) return;
        if (picked.size > MAX_IMAGE_BYTES) {
            onTooLarge();

            return;
        }
        onPick(picked);
    };

    return (
        <div>
            <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
                {src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : <ImagePlus size={30} strokeWidth={1.25} className="text-[#6f8566]" aria-hidden="true" />}
            </div>
            <label className={`${secondary} mt-3 w-full cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-primary`}>
                <Upload size={14} />
                {src ? __('Change image') : __('Upload image')}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} className="sr-only" />
            </label>
            {src && (
                <button type="button" onClick={onRemove} className="mt-2 w-full text-[10px] text-[#a9ba9e] hover:text-rose-300">
                    {__('Remove image')}
                </button>
            )}
            <p className="mt-2 text-[9px] leading-5 text-[#98ae8a]">{__('Concept art or reference. JPG, PNG or WebP up to 5 MB.')}</p>
        </div>
    );
}
