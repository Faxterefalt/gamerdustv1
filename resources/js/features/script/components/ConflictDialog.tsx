import { Copy, Eye, Save } from 'lucide-react';
import { useState } from 'react';
import Modal, { Pending } from '../../../shared/components/ui';
import { __ } from '../../../shared/lib/i18n';
import { primarySm, secondary } from '../../../shared/lib/styles';
import type { BlockKind, ScriptBlock, ScriptScene } from '../script.types';
import VersionDiff from './VersionDiff';

interface ConflictDialogProps {
    /** Versión guardada por otra persona (respuesta 409 del servidor). */
    theirs: ScriptScene;
    savedBy: string | null;
    mine: ScriptBlock[];
    kindLabel: (kind: BlockKind) => string;
    pending: boolean;
    onOverwrite: () => void;
    onCopyMine: () => void;
    onClose: () => void;
}

/**
 * Conflicto al guardar (HU 26): la escena se guardó en otro sitio mientras la editabas. Nada se pierde:
 * se pueden ver los cambios del otro, sobrescribirlos con la versión propia, o copiar la propia y
 * cargar la guardada (Deshacer recupera la propia).
 */
export default function ConflictDialog({ theirs, savedBy, mine, kindLabel, pending, onOverwrite, onCopyMine, onClose }: ConflictDialogProps) {
    const [showDiff, setShowDiff] = useState(false);

    return (
        <Modal title={__('This scene changed while you were editing')} wide onClose={() => !pending && onClose()}>
            <p className="text-xs leading-6 text-muted">
                {savedBy
                    ? __(':name saved this scene after you opened it. Choose what to do with your changes.', { name: savedBy })
                    : __('Someone saved this scene after you opened it. Choose what to do with your changes.')}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" className={secondary} disabled={pending} onClick={() => setShowDiff((value) => !value)} aria-expanded={showDiff}>
                    <Eye size={14} /> {__('See the other changes')}
                </button>
                <button type="button" className={secondary} disabled={pending} onClick={onCopyMine}>
                    <Copy size={14} /> {__('Copy my version')}
                </button>
                <button type="button" className={primarySm} disabled={pending} onClick={onOverwrite}>
                    <Pending pending={pending}>
                        <Save size={14} /> {__('Overwrite')}
                    </Pending>
                </button>
            </div>

            <ul className="mt-4 space-y-1 text-xs leading-5 text-muted">
                <li>{__('Overwrite: saves your version on top of theirs (theirs stays in the version history).')}</li>
                <li>{__('Copy my version: copies your text to the clipboard and loads the saved version; Undo brings yours back.')}</li>
            </ul>

            {showDiff && (
                <div className="mt-5 max-h-[50vh] overflow-y-auto rounded-md border border-border p-3">
                    <p className="mb-3 text-xs text-muted">{__('From your version to the saved one: in green what they added, in red what is only in yours.')}</p>
                    <VersionDiff before={mine} after={theirs.script} kindLabel={kindLabel} />
                </div>
            )}
        </Modal>
    );
}
