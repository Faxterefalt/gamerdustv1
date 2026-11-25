import { ExternalLink, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { __ } from '../../../shared/lib/i18n';

interface PlaytestDialogProps {
    projectId: number;
    /** Nodo desde el que empezar; null = el inicio del grafo. */
    startNodeId: number | null;
    onClose: () => void;
}

/**
 * "Probar recorrido" (HU 22): el mismo reproductor que la exportación HTML, servido por el servidor
 * con el grafo ya guardado. Solo lectura: las variables viven en la página y nada se escribe en la BD.
 */
export default function PlaytestDialog({ projectId, startNodeId, onClose }: PlaytestDialogProps) {
    const ref = useRef<HTMLDialogElement>(null);
    const [run, setRun] = useState(0);
    const url = `/projects/${projectId}/branching/playtest${startNodeId ? `?node=${startNodeId}` : ''}`;

    useEffect(() => {
        const element = ref.current!;
        element.showModal();

        return () => element.close();
    }, []);

    return (
        <dialog
            ref={ref}
            aria-label={__('Test run')}
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            className="fixed inset-0 m-auto h-[92dvh] w-[calc(100%-32px)] max-w-6xl overflow-hidden rounded-xl border border-border-strong bg-background p-0 text-foreground backdrop:bg-scrim"
        >
            <div className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                    <p className="text-xs text-muted">{__('Test run of the saved graph. Choices and variables are not saved.')}</p>
                    <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setRun((value) => value + 1)} className="flex items-center gap-1.5 rounded px-2 py-1.5 text-xs hover:bg-surface-2">
                            <RotateCcw size={13} /> {__('Reload')}
                        </button>
                        <a href={url} target="_blank" rel="noopener" className="flex items-center gap-1.5 rounded px-2 py-1.5 text-xs hover:bg-surface-2">
                            <ExternalLink size={13} /> {__('Open in a new tab')}
                        </a>
                        <button type="button" onClick={onClose} aria-label={__('Close window')} className="rounded p-1.5 hover:bg-surface-2">
                            <X size={16} />
                        </button>
                    </div>
                </div>
                <iframe key={run} src={url} title={__('Test run')} className="min-h-0 flex-1 border-0 bg-background" />
            </div>
        </dialog>
    );
}
