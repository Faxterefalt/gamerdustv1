import { AlertTriangle, Info } from 'lucide-react';
import { __ } from '../../../shared/lib/i18n';
import type { EmotionCatalog, EmotionChange, NarrativeLabels, Vad } from '../emotion.types';
import { emotionLabel } from '../labels';
import { cssVar } from '../../../shared/lib/tokens';

/** Chip con el color y el nombre de una emoción. */
export function EmotionChip({ emotion, catalog, size = 'md' }: { emotion: string; catalog: EmotionCatalog; size?: 'sm' | 'md' }) {
    const color = catalog.emotions[emotion]?.color ?? cssVar('subtle');

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'}`}
            style={{ borderColor: `${color}66`, backgroundColor: `${color}1a`, color }}
        >
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {emotionLabel(emotion)}
        </span>
    );
}

/** "Tono: Negativo, Tensión: Alta" (y control si se pide). En modo técnico, además, v/a/d. */
export function NarrativeLine({ labels, vad, technical, withControl = false }: { labels: NarrativeLabels; vad: Vad; technical: boolean; withControl?: boolean }) {
    return (
        <p className="text-xs leading-5 text-muted">
            {__('Tone')}: <strong className="font-medium text-foreground">{labels.tone}</strong>, {__('Tension')}: <strong className="font-medium text-foreground">{labels.tension}</strong>
            {withControl && (
                <>
                    {' '}
                    , {__('Character control')}: <strong className="font-medium text-foreground">{labels.control}</strong>
                </>
            )}
            {technical && <span className="ml-2 text-xs text-subtle">{`v ${vad.v.toFixed(2)}, a ${vad.a.toFixed(2)}, d ${vad.d.toFixed(2)}`}</span>}
        </p>
    );
}

/** Alerta de cambio abrupto: roja sin causa visible, ámbar si el texto lo justifica. */
export function ChangeAlert({ change }: { change: EmotionChange }) {
    if (!change.alert) {
        return null;
    }

    const red = change.alert === 'red';

    return (
        <div
            role={red ? 'alert' : 'status'}
            className={`flex gap-2 rounded-md border p-2.5 text-xs leading-5 ${red ? 'border-danger/30 bg-danger/10 text-danger' : 'border-primary/30 bg-primary/10 text-warning'}`}
        >
            {red ? <AlertTriangle size={13} className="mt-0.5 shrink-0" /> : <Info size={13} className="mt-0.5 shrink-0" />}
            <span>
                <strong className="block font-medium">{red ? __('Abrupt emotional change with no visible cause in the scene') : __('Strong change, but the text justifies it')}</strong>
                {change.explanation && <span className="mt-0.5 block opacity-90">{change.explanation}</span>}
            </span>
        </div>
    );
}

/** Cita breve y literal del texto que respalda la lectura. */
export function Evidence({ text }: { text: string }) {
    return text ? <blockquote className="border-l-2 border-primary/40 pl-3 text-xs italic leading-5 text-muted">“{text}”</blockquote> : null;
}
