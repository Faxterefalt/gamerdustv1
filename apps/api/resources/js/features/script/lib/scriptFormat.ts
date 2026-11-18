import type { BlockKind } from '../script.types';

/**
 * Convención de guion al pulsar Enter al final de un bloque (HU 14):
 * personaje → diálogo, diálogo → acción, encabezado → acción, acotación → diálogo, acción → acción.
 */
export const NEXT_KIND: Record<BlockKind, BlockKind> = {
    character: 'dialogue',
    dialogue: 'action',
    heading: 'action',
    parenthetical: 'dialogue',
    action: 'action',
};

/**
 * ¿Es la línea el nombre de un personaje de la escena escrito en MAYÚSCULAS?
 * Coincide con el nombre completo o con su primera palabra ("IRENE" para "Irene Vallejo").
 * Devuelve el nombre del personaje o null.
 */
export function matchCharacterLine(text: string, names: string[], locale?: string): string | null {
    if (text.trim().includes('\n')) {
        return null;
    }

    const line = text.trim().replace(/\s+/gu, ' ');

    if (!line || !/\p{L}/u.test(line) || line !== line.toLocaleUpperCase(locale)) {
        return null;
    }

    for (const name of names) {
        const full = name.trim().replace(/\s+/gu, ' ').toLocaleUpperCase(locale);
        const first = full.split(' ')[0];

        if (line === full || line === first) {
            return name;
        }
    }

    return null;
}
