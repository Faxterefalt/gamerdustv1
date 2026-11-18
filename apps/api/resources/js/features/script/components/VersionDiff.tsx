import { __, choice } from '../../../shared/lib/i18n';
import { diffBlocks, diffSummary, type BlockChange } from '../lib/diffBlocks';
import type { BlockKind, ScriptBlock } from '../script.types';

interface VersionDiffProps {
    before: ScriptBlock[];
    after: ScriptBlock[];
    /** Etiqueta de cada tipo de bloque (ya traducida). */
    kindLabel: (kind: BlockKind) => string;
}

const STYLE: Record<BlockChange, string> = {
    same: 'border-transparent text-[#9fb093]',
    added: 'border-emerald-500 bg-emerald-500/10 text-[#d7f0c8]',
    removed: 'border-rose-500 bg-rose-500/10 text-[#f1c9c2]',
    modified: 'border-amber-400 bg-amber-400/10 text-[#efe2bd]',
    moved: 'border-sky-400 bg-sky-400/10 text-[#cde3f0]',
};

// Claves de traducción.
const LABEL: Record<Exclude<BlockChange, 'same'>, string> = { added: 'Added', removed: 'Removed', modified: 'Modified', moved: 'Moved' };

/**
 * Comparación por bloques (HU 25): añadidos, eliminados, modificados y movidos. Solo lectura.
 */
export default function VersionDiff({ before, after, kindLabel }: VersionDiffProps) {
    const diff = diffBlocks(before, after);
    const summary = diffSummary(diff);
    const changes = summary.added + summary.removed + summary.modified + summary.moved;

    return (
        <div>
            <p role="status" className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#a9bb9d]">
                {changes === 0 ? (
                    __('No differences between these versions.')
                ) : (
                    <>
                        <span className="text-emerald-300">{choice(':count added|:count added', summary.added)}</span>
                        <span className="text-rose-300">{choice(':count removed|:count removed', summary.removed)}</span>
                        <span className="text-amber-200">{choice(':count modified|:count modified', summary.modified)}</span>
                        {summary.moved > 0 && <span className="text-sky-300">{choice(':count moved|:count moved', summary.moved)}</span>}
                    </>
                )}
            </p>
            <ol className="max-h-80 space-y-1.5 overflow-y-auto rounded-md border border-border bg-background p-3">
                {diff.map((item, index) => {
                    const shown = item.after ?? item.before!;

                    return (
                        <li key={index} className={`rounded-sm border-l-2 px-3 py-2 font-mono text-[10px] leading-6 ${STYLE[item.change]}`}>
                            <span className="mr-2 text-[8px] uppercase tracking-wider opacity-70">
                                {kindLabel(shown.kind)}
                                {item.change !== 'same' && ` · ${__(LABEL[item.change])}`}
                                {item.change === 'moved' && item.edited && ` · ${__('Modified')}`}
                            </span>
                            {(item.change === 'modified' || (item.change === 'moved' && item.edited)) && item.before && (
                                <>
                                    {item.before.kind !== shown.kind && <span className="mr-2 text-[8px] uppercase opacity-70">({kindLabel(item.before.kind)} →)</span>}
                                    <del className="block whitespace-pre-wrap break-words opacity-70">{item.before.text || '∅'}</del>
                                </>
                            )}
                            <span className={`block whitespace-pre-wrap break-words ${item.change === 'removed' ? 'line-through' : ''}`}>{shown.text || '∅'}</span>
                        </li>
                    );
                })}
                {!diff.length && <li className="text-[10px] text-[#a2b697]">{__('Both versions are empty.')}</li>}
            </ol>
        </div>
    );
}
