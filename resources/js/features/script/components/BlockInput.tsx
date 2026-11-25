import { Trash2 } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import { __ } from '../../../shared/lib/i18n';
import type { BlockKind, ScriptBlock } from '../script.types';

const BLOCK_CLASSES: Record<BlockKind, string> = {
    heading: 'mb-8 text-base font-bold uppercase italic leading-7 sm:text-lg',
    action: 'mb-8 text-xs leading-7 sm:text-xs',
    character: 'mb-1 mt-7 text-center text-xs font-bold uppercase leading-6 sm:text-xs',
    dialogue: 'mx-auto mb-5 w-[78%] text-xs leading-6 sm:w-[65%] sm:text-xs',
    parenthetical: 'mx-auto mb-2 w-[65%] text-center text-xs italic leading-6',
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
        <div className={`group relative ${BLOCK_CLASSES[block.kind]}`}>
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
                className={`block min-h-6 w-full resize-none overflow-hidden rounded-sm border-0 bg-transparent p-0 text-inherit placeholder:text-subtle focus-visible:!outline-0 ${centered ? 'text-center' : 'text-left'}`}
            />
            <button
                type="button"
                disabled={disabled}
                aria-label={__('Delete block :number', { number: index + 1 })}
                title={__('Delete block')}
                onClick={onRemove}
                className="absolute -right-6 top-1 rounded p-1 text-subtle opacity-0 transition hover:bg-background/5 hover:text-danger focus:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 sm:-right-7"
            >
                <Trash2 size={12} />
            </button>
        </div>
    );
}
