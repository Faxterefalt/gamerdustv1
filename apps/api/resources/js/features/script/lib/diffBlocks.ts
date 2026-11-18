import type { BlockKind, ScriptBlock } from '../script.types';

export type BlockChange = 'same' | 'added' | 'removed' | 'modified' | 'moved';

export interface BlockDiff {
    change: BlockChange;
    /** Bloque en la versión de partida (null si es nuevo). */
    before: Pick<ScriptBlock, 'kind' | 'text'> | null;
    /** Bloque en la versión comparada (null si se eliminó). */
    after: Pick<ScriptBlock, 'kind' | 'text'> | null;
    /** En un bloque movido: si además cambió su contenido. */
    edited?: boolean;
}

type Keyed = { key: string; kind: BlockKind; text: string };

/** Identidad del bloque: su id; si falta (datos antiguos), su posición. */
function keyed(blocks: Pick<ScriptBlock, 'id' | 'kind' | 'text'>[]): Keyed[] {
    return blocks.map((block, index) => ({ key: block.id ? `id:${block.id}` : `#${index}`, kind: block.kind, text: block.text ?? '' }));
}

const sameContent = (a: Keyed, b: Keyed) => a.kind === b.kind && a.text === b.text;

/**
 * Comparación por bloques entre dos versiones de una escena (diff propio, sin librerías).
 *
 * Los bloques se emparejan por id. Con la subsecuencia común más larga de ids se decide el orden:
 * - id solo en `after` → añadido; id solo en `before` → eliminado;
 * - id en ambos y en la subsecuencia → igual o modificado (tipo o texto distintos);
 * - id en ambos pero fuera de la subsecuencia → movido (se muestra en su nueva posición).
 */
export function diffBlocks(beforeBlocks: Pick<ScriptBlock, 'id' | 'kind' | 'text'>[], afterBlocks: Pick<ScriptBlock, 'id' | 'kind' | 'text'>[]): BlockDiff[] {
    const before = keyed(beforeBlocks);
    const after = keyed(afterBlocks);
    const afterKeys = new Set(after.map((block) => block.key));
    const beforeByKey = new Map(before.map((block) => [block.key, block]));

    // LCS de claves (O(n·m): las escenas tienen como mucho unos cientos de bloques).
    const n = before.length;
    const m = after.length;
    const table: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));

    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            table[i][j] = before[i].key === after[j].key ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
        }
    }

    const result: BlockDiff[] = [];
    const view = (block: Keyed) => ({ kind: block.kind, text: block.text });
    let i = 0;
    let j = 0;

    while (i < n || j < m) {
        if (i < n && j < m && before[i].key === after[j].key) {
            result.push({ change: sameContent(before[i], after[j]) ? 'same' : 'modified', before: view(before[i]), after: view(after[j]) });
            i++;
            j++;
        } else if (j < m && (i >= n || table[i][j + 1] >= table[i + 1][j])) {
            const moved = beforeByKey.get(after[j].key);
            result.push(
                moved
                    ? { change: 'moved', before: view(moved), after: view(after[j]), edited: !sameContent(moved, after[j]) }
                    : { change: 'added', before: null, after: view(after[j]) },
            );
            j++;
        } else {
            // Un bloque que sigue existiendo en otra posición ya aparece como movido.
            if (!afterKeys.has(before[i].key)) {
                result.push({ change: 'removed', before: view(before[i]), after: null });
            }
            i++;
        }
    }

    return result;
}

export function diffSummary(diff: BlockDiff[]): Record<Exclude<BlockChange, 'same'>, number> {
    const summary = { added: 0, removed: 0, modified: 0, moved: 0 };

    for (const item of diff) {
        if (item.change !== 'same') {
            summary[item.change]++;
        }
    }

    return summary;
}
