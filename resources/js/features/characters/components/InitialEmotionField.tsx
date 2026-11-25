import { HeartPulse } from 'lucide-react';
import { __ } from '../../../shared/lib/i18n';
import { field } from '../../../shared/lib/styles';
import type { EmotionCatalog } from '../../analysis/emotion.types';
import { emotionLabel, intensityLabel } from '../../analysis/labels';

interface InitialEmotionFieldProps {
    catalog: EmotionCatalog;
    emotion: string;
    intensity: string;
    onChange: (emotion: string, intensity: string) => void;
}

/**
 * Estado emocional con el que el autor hace empezar al personaje: emoción + intensidad.
 * Sin valores numéricos: el servidor calcula el punto de partida a partir de la emoción.
 */
export default function InitialEmotionField({ catalog, emotion, intensity, onChange }: InitialEmotionFieldProps) {
    const color = emotion ? catalog.emotions[emotion]?.color : undefined;

    return (
        <section className="rounded-lg border border-border bg-background/40 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <HeartPulse size={15} className="text-primary" /> {__('How does this character feel at the start of the story?')}
                </h3>
                <span className="rounded-full border border-primary/25 px-2 py-0.5 text-xs text-primary">{__('Set by you')}</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <label className="block text-xs">
                    {__('Emotion')}
                    <span className="relative block">
                        <select
                            value={emotion}
                            // Al elegir la primera emoción se propone intensidad media.
                            onChange={(event) => onChange(event.target.value, event.target.value ? intensity || 'medium' : '')}
                            className={`${field} ${color ? 'pl-9' : ''}`}
                        >
                            <option value="">{__('— None —')}</option>
                            {Object.keys(catalog.emotions).map((key) => (
                                <option key={key} value={key}>
                                    {emotionLabel(key)}
                                </option>
                            ))}
                        </select>
                        {color && <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: color }} />}
                    </span>
                </label>

                <fieldset disabled={!emotion} className="disabled:opacity-40">
                    <legend className="text-xs">{__('Intensity')}</legend>
                    <div className="mt-2 inline-flex overflow-hidden rounded-md border border-border">
                        {catalog.intensities.map((key) => (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={intensity === key}
                                onClick={() => onChange(emotion, key)}
                                className={`min-h-11 px-4 text-xs transition ${
                                    intensity === key ? 'bg-primary text-primary-ink font-semibold' : 'text-muted hover:bg-primary/5'
                                }`}
                            >
                                {intensityLabel(key)}
                            </button>
                        ))}
                    </div>
                </fieldset>
            </div>

            <p className="mt-3 text-xs leading-5 text-muted">
                {__('It is the starting point of their emotional arc: the AI analysis compares their first scenes with it.')}
            </p>
        </section>
    );
}
