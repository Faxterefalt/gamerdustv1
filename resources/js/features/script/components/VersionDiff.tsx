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
    same: 'border-transparent text-muted',
    added: 'border-success bg-success/10 text-foreground',
    removed: 'border-danger bg-danger/10 text-muted',
    modified: 'border-primary bg-primary/10 text-foreground',
    moved: 'border-info bg-info/10 text-foreground',
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
            <p role="status" className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                {changes === 0 ? (
                    __('No differences between these versions.')
                ) : (
                    <>
                        <span className="text-success">{choice(':count added|:count added', summary.added)}</span>
                        <span className="text-danger">{choice(':count removed|:count removed', summary.removed)}</span>
                        <span className="text-primary">{choice(':count modified|:count modified', summary.modified)}</span>
                        {summary.moved > 0 && <span className="text-info">{choice(':count moved|:count moved', summary.moved)}</span>}
                    </>
                )}
            </p>
            <ol className="max-h-80 space-y-1.5 overflow-y-auto rounded-md border border-border bg-background p-3">
                {diff.map((item, index) => {
                    const shown = item.after ?? item.before!;

                    return (
                        <li key={index} className={`rounded-sm border-l-2 px-3 py-2 font-script text-sm leading-6 ${STYLE[item.change]}`}>
                            <span className="mr-2 text-xs opacity-70">
                                {kindLabel(shown.kind)}
                                {item.change !== 'same' && ` · ${__(LABEL[item.change])}`}
                                {item.change === 'moved' && item.edited && ` · ${__('Modified')}`}
                            </span>
                            {(item.change === 'modified' || (item.change === 'moved' && item.edited)) && item.before && (
                                <>
                                    {item.before.kind !== shown.kind && <span className="mr-2 text-xs opacity-70">({kindLabel(item.before.kind)} →)</span>}
                                    <del className="block whitespace-pre-wrap break-words opacity-70">{item.before.text || '∅'}</del>
                                </>
                            )}
                            <span className={`block whitespace-pre-wrap break-words ${item.change === 'removed' ? 'line-through' : ''}`}>{shown.text || '∅'}</span>
                        </li>
                    );
                })}
                {!diff.length && <li className="text-xs text-muted">{__('Both versions are empty.')}</li>}
            </ol>
        </div>
    );
}
