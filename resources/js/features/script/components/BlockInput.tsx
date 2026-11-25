import { Trash2 } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import { __ } from '../../../shared/lib/i18n';
import type { BlockKind, ScriptBlock } from '../script.types';

const BLOCK_CLASSES: Record<BlockKind, string> = {
    // Convención de guion: Courier a ~12 pt (16 px), encabezado y personaje en mayúsculas.
    heading: 'mb-6 text-base font-bold uppercase leading-7',
    action: 'mb-6 text-base leading-7',
    character: 'mb-0.5 mt-6 text-center text-base font-bold uppercase leading-7',
    dialogue: 'mx-auto mb-5 w-[82%] text-base leading-7 sm:w-[62%]',
    parenthetical: 'mx-auto mb-1 w-[70%] text-center text-base italic leading-7 text-paper-muted',
};

// Claves de traducción de los marcadores de posición.
const PLACEHOLDERS: Record<BlockKind, string> = {
    heading: 'EXT. PLACE - TIME',
    action: 'Describe what happens…',
    character: 'CHARACTER',
    dialogue: 'What has not been said yet…',
    parenthetical: '(An intention, a gesture…)',
};

interface BlockInputProps {
    block: ScriptBlock;
    label: string;
    index: number;
    disabled: boolean;
    onChange: (text: string) => void;
    onFocus: () => void;
    onRemove: () => void;
    /** Enter (sin Mayús) con el cursor al final del bloque: el editor crea el siguiente según la convención. */
    onEnterAtEnd: () => void;
}

/**
 * Bloque de guion editable: un textarea que crece con su contenido y adopta el formato de guion de su tipo.
 */
export default function BlockInput({ block, label, index, disabled, onChange, onFocus, onRemove, onEnterAtEnd }: BlockInputProps) {
    const ref = useRef<HTMLTextAreaElement>(null);

    useLayoutEffect(() => {
        const element = ref.current!;
        const resize = () => {
            element.style.height = '0px';
            element.style.height = `${element.scrollHeight}px`;
        };
        let width = element.clientWidth;
        resize();

        const observer = new ResizeObserver(() => {
            if (element.clientWidth !== width || element.scrollHeight > element.clientHeight) {
                width = element.clientWidth;
                resize();
            }
        });
        observer.observe(element);
        const frame = requestAnimationFrame(resize);

        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
        };
    }, [block.text]);

    const centered = block.kind === 'character' || block.kind === 'parenthetical';

    return (
        <div className={`group relative rounded-sm focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-paper-muted ${BLOCK_CLASSES[block.kind]}`}>
            <textarea
                ref={ref}
                id={`script-block-${block.id}`}
                aria-label={`${label} ${index + 1}`}
                rows={1}
                disabled={disabled}
                value={block.text}
                onChange={(event) => onChange(event.target.value)}
                onFocus={onFocus}
                onKeyDown={(event) => {
                    const element = event.currentTarget;
                    const atEnd = element.selectionStart === element.value.length && element.selectionEnd === element.value.length;

                    // Mayús+Enter sigue siendo un salto de línea dentro del bloque.
                    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && !event.nativeEvent.isComposing && atEnd) {
                        event.preventDefault();
                        onEnterAtEnd();
                    }
                }}
                placeholder={__(PLACEHOLDERS[block.kind])}
                className={`block min-h-6 w-full resize-none overflow-hidden rounded-sm border-0 bg-transparent p-0 text-inherit placeholder:text-paper-muted focus-visible:!outline-0 ${centered ? 'text-center' : 'text-left'}`}
            />
            <button
                type="button"
                disabled={disabled}
                aria-label={__('Delete block :number', { number: index + 1 })}
                title={__('Delete block')}
                onClick={onRemove}
                className="absolute -right-8 top-0.5 inline-flex size-7 items-center justify-center rounded-sm text-paper-muted opacity-0 transition-opacity hover:bg-paper-rule hover:text-paper-ink focus:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 sm:-right-9"
            >
                <Trash2 size={15} />
            </button>
        </div>
    );
}
