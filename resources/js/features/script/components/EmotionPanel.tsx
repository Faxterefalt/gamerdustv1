import { Link } from '@inertiajs/react';
import { HeartPulse, LoaderCircle, RefreshCw, Sparkles, UserRound, Wand2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormError } from '../../../shared/components/ui';
import { api, ApiError } from '../../../shared/lib/api';
import { __, locale } from '../../../shared/lib/i18n';
import { primarySm, secondary } from '../../../shared/lib/styles';
import { ChangeAlert, EmotionChip, Evidence, NarrativeLine } from '../../analysis/components/EmotionBits';
import FeedbackButtons from '../../analysis/components/FeedbackButtons';
import type { CharacterEmotion, EmotionCatalog, EmotionChange, SceneEmotionAnalysis } from '../../analysis/emotion.types';
import { emotionLabel, severityLabel, suggestionKindLabel } from '../../analysis/labels';

const TECHNICAL_KEY = 'gamerdust.emotion-technical';

interface EmotionPanelProps {
    projectId: number;
    sceneId: number;
    sceneCode: string;
    /** Hay cambios sin guardar en esta escena: el análisis usa la versión guardada. */
    dirty: boolean;
    catalog: EmotionCatalog;
    /** El usuario pulsó "Analizar emociones" en la barra: se analiza al montar y se avisa con onConsumed. */
    pendingAnalyze: boolean;
    onConsumed: () => void;
    onClose: () => void;
    /** "Usar como base": abre Refinar con la sugerencia como instrucción (nada se aplica sin Aplicar + Guardar). */
    onUseSuggestion?: (text: string) => void;
}

function readTechnical(): boolean {
    try {
        return localStorage.getItem(TECHNICAL_KEY) === 'true';
    } catch {
        return false;
    }
}

/**
 * Panel lateral de análisis emocional de la escena guardada. Solo lee y propone:
 * nunca modifica el guion. La IA solo se llama al pulsar Analizar o Reanalizar.
 */
export default function EmotionPanel({ projectId, sceneId, sceneCode, dirty, catalog, pendingAnalyze, onConsumed, onClose, onUseSuggestion }: EmotionPanelProps) {
    const [analysis, setAnalysis] = useState<SceneEmotionAnalysis | null>(null);
    const [status, setStatus] = useState<'loading' | 'analyzing' | 'idle'>('loading');
    const [error, setError] = useState('');
    const [warning, setWarning] = useState('');
    const [technical, setTechnical] = useState(readTechnical);
    // Solo cuenta la respuesta de la última petición (cambio de escena, Reanalizar...).
    const sequence = useRef(0);
    const base = `/projects/${projectId}/script/scenes/${sceneId}`;

    const analyze = useCallback(
        (force: boolean) => {
            if (dirty) {
                setWarning(__('Save the scene before analyzing; the analysis uses the saved version.'));

                return;
            }

            const id = ++sequence.current;
            setStatus('analyzing');
            setError('');
            setWarning('');

            api<{ analysis: SceneEmotionAnalysis }>('POST', `${base}/analyze`, { force })
                .then((response) => {
                    if (id === sequence.current) {
                        setAnalysis(response.analysis);
                    }
                })
                .catch((caught: unknown) => {
                    if (id === sequence.current) {
                        setError(caught instanceof ApiError && caught.status === 422 ? caught.message : __('AI is busy, try again in a minute'));
                    }
                })
                .finally(() => {
                    if (id === sequence.current) {
                        setStatus('idle');
                    }
                });
        },
        [base, dirty],
    );

    // Último análisis guardado (no llama a la IA).
    useEffect(() => {
        const id = ++sequence.current;

        api<{ analysis: SceneEmotionAnalysis | null }>('GET', `${base}/analysis`)
            .then((response) => {
                if (id === sequence.current) {
                    setAnalysis(response.analysis);
                }
            })
            .catch(() => {
                if (id === sequence.current) {
                    setError(__('Could not load the analysis.'));
                }
            })
            .finally(() => {
                if (id === sequence.current) {
                    setStatus('idle');
                }
            });
    }, [base]);

    useEffect(() => {
        if (pendingAnalyze) {
            onConsumed();
            analyze(false);
        }
    }, [pendingAnalyze, onConsumed, analyze]);

    useEffect(() => {
        const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
        window.addEventListener('keydown', close);

        return () => window.removeEventListener('keydown', close);
    }, [onClose]);

    function toggleTechnical() {
        setTechnical((value) => {
            try {
                localStorage.setItem(TECHNICAL_KEY, String(!value));
            } catch {
                // Preferencia opcional: sin almacenamiento simplemente no se recuerda.
            }

            return !value;
        });
    }

    const busy = status !== 'idle';
    const dateLocale = locale === 'en' ? 'en-US' : 'es-ES';

    return (
        <aside
            role="dialog"
            aria-label={__('Emotional analysis of :scene', { scene: sceneCode })}
            className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[400px] flex-col border-l border-border bg-surface text-foreground"
        >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
                <div>
                    <p className="font-pixel text-primary">{sceneCode}</p>
                    <h2 className="mt-1 flex items-center gap-2 text-lg font-bold">
                        <HeartPulse size={17} className="text-primary" /> {__('How this scene feels')}
                    </h2>
                </div>
                <button type="button" onClick={onClose} aria-label={__('Close panel')} className="rounded p-2 text-muted hover:bg-surface-2">
                    <X size={17} />
                </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
                    <input type="checkbox" checked={technical} onChange={toggleTechnical} className="accent-primary" />
                    {__('Technical mode')}
                </label>
                {analysis ? (
                    <button type="button" disabled={busy} onClick={() => analyze(true)} className={`${secondary} !min-h-9 !text-xs`}>
                        <RefreshCw size={13} /> {__('Reanalyze')}
                    </button>
                ) : (
                    <button type="button" disabled={busy} onClick={() => analyze(false)} className={`${primarySm} !min-h-9 !py-2 !text-xs`}>
                        <Sparkles size={13} /> {__('Analyze emotions')}
                    </button>
                )}
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                {busy && (
                    <p role="status" className="flex items-center gap-2 text-xs text-primary">
                        <LoaderCircle size={14} className="animate-spin motion-reduce:animate-none" /> {status === 'analyzing' ? __('Reading the scene…') : __('Loading…')}
                    </p>
                )}
                {warning && (
                    <p role="alert" className="rounded-md border border-primary/30 bg-primary/10 p-3 text-xs leading-5 text-warning">
                        {warning}
                    </p>
                )}
                <FormError error={error} />

                {!busy && !analysis && !error && (
                    <p className="text-xs leading-6 text-muted">
                        {__('No analysis yet for this scene. Press Analyze emotions: the AI reads the saved version with its characters, location and world rules.')}
                    </p>
                )}

                {analysis && <AnalysisView projectId={projectId} analysis={analysis} catalog={catalog} technical={technical} dateLocale={dateLocale} onUseSuggestion={onUseSuggestion} />}
            </div>

            <p className="border-t border-border px-5 py-3 text-xs leading-5 text-subtle">{__('The AI only suggests: it never changes your script.')}</p>
        </aside>
    );
}

function AnalysisView({
    projectId,
    analysis,
    catalog,
    technical,
    dateLocale,
    onUseSuggestion,
}: {
    projectId: number;
    analysis: SceneEmotionAnalysis;
    catalog: EmotionCatalog;
    technical: boolean;
    dateLocale: string;
    onUseSuggestion?: (text: string) => void;
}) {
    const { scene } = analysis;

    return (
        <>
            <div className="space-y-2 text-xs leading-5 text-muted">
                {analysis.created_at && <p>{__('Last analysis: :time', { time: new Date(analysis.created_at).toLocaleString(dateLocale) })}</p>}
                {analysis.stale && <Note>{__('The scene or its Bible sheets changed after this analysis. Reanalyze to update it.')}</Note>}
                {analysis.degraded && <Note>{__('AI is busy; showing a basic keyword analysis.')}</Note>}
                {analysis.source === 'keywords' && !analysis.degraded && <Note>{__('Basic keyword analysis: the AI connection is not configured.')}</Note>}
                {analysis.truncated && <Note>{__('The scene is long: only its first part was analyzed.')}</Note>}
                {technical && analysis.model && <p className="font-mono text-xs">{analysis.model}</p>}
            </div>

            <section className="space-y-3 rounded-lg border border-border bg-background/40 p-4">
                <EmotionChip emotion={scene.emotion} catalog={catalog} />
                <NarrativeLine labels={scene.labels} vad={scene.vad} technical={technical} />
                {scene.summary && <p className="text-xs leading-6 text-foreground">{scene.summary}</p>}
                <Evidence text={scene.evidence} />
                {scene.change.alert && <p className="text-xs text-muted">{previousLine(scene.change, true)}</p>}
                <ChangeAlert change={scene.change} />
            </section>

            {analysis.characters.length > 0 && (
                <section>
                    <h3 className="mb-3 text-xs font-medium text-foreground">{__('Characters')}</h3>
                    <div className="space-y-3">
                        {analysis.characters.map((character) => (
                            <CharacterCard key={character.character_id} character={character} catalog={catalog} technical={technical} />
                        ))}
                    </div>
                </section>
            )}

            {analysis.inconsistencies.length > 0 && (
                <section>
                    <h3 className="mb-3 text-xs font-medium text-foreground">{__('Inconsistencies with the lore')}</h3>
                    <ul className="space-y-3">
                        {analysis.inconsistencies.map((item, index) => (
                            <li key={index} className="rounded-lg border border-border p-3 text-xs leading-5">
                                <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                                    <span className="rounded border border-border px-1.5 py-0.5">{__('Severity: :level', { level: severityLabel(item.severity) })}</span>
                                    {item.url ? (
                                        <Link href={item.url} className="text-primary underline">
                                            {item.contradicts}
                                        </Link>
                                    ) : (
                                        <span>{item.contradicts}</span>
                                    )}
                                </p>
                                <p className="mt-2 text-foreground">{item.explanation}</p>
                                <Evidence text={item.fragment} />
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {analysis.suggestions.length > 0 && (
                <section>
                    <h3 className="mb-3 text-xs font-medium text-foreground">{__('Suggestions')}</h3>
                    <ul className="space-y-3">
                        {analysis.suggestions.map((suggestion, index) => (
                            <li key={index} className="rounded-lg border border-dashed border-border p-3 text-xs leading-5">
                                <span className="text-sm font-bold text-primary">{suggestionKindLabel(suggestion.kind)}</span>
                                <p className="mt-1 text-foreground">{suggestion.text}</p>
                                {suggestion.why && <p className="mt-1 text-xs text-muted">{suggestion.why}</p>}
                                <div className="mt-2 flex items-center justify-end gap-3">
                                    {onUseSuggestion && (
                                        <button
                                            type="button"
                                            onClick={() => onUseSuggestion(suggestion.why ? `${suggestion.text} (${suggestion.why})` : suggestion.text)}
                                            title={__('Open Refine with AI using this suggestion as the instruction')}
                                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                        >
                                            <Wand2 size={12} /> {__('Use as a base')}
                                        </button>
                                    )}
                                    <FeedbackButtons
                                        key={analysis.id}
                                        projectId={projectId}
                                        target={{ emotional_analysis_id: analysis.id }}
                                        index={index}
                                        initial={analysis.feedback[index] ?? null}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </>
    );
}

function CharacterCard({ character, catalog, technical }: { character: CharacterEmotion; catalog: EmotionCatalog; technical: boolean }) {
    return (
        <article className="space-y-2.5 rounded-lg border border-border p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 text-xs font-medium">
                    <UserRound size={13} className="text-primary" /> {character.name}
                </h4>
                <EmotionChip emotion={character.emotion} catalog={catalog} size="sm" />
            </div>
            <NarrativeLine labels={character.labels} vad={character.vad} technical={technical} withControl />
            <Evidence text={character.evidence} />
            <p className="text-xs text-muted">{previousLine(character.change, false)}</p>
            {character.out_of_character && (
                <div className="rounded-md border border-danger/30 bg-danger/10 p-2.5 text-xs leading-5 text-danger">
                    <strong className="font-medium">{__('Out of character')}</strong>
                    {character.out_of_character_reason && <span className="mt-0.5 block">{character.out_of_character_reason}</span>}
                </div>
            )}
            <ChangeAlert change={character.change} />
        </article>
    );
}

/** De dónde viene la comparación: estado del autor, de la IA en una escena anterior o ninguno. */
function previousLine(change: EmotionChange, scene: boolean): string {
    const previous = change.previous;

    if (!previous || previous.origin === 'none' || !previous.emotion) {
        return scene ? __('No previous scene analyzed.') : __('First analyzed appearance: nothing to compare with.');
    }

    if (previous.origin === 'author') {
        return __('Before: :emotion · Set by you', { emotion: emotionLabel(previous.emotion) });
    }

    return __('Before: :emotion in :scene · Detected by AI', { emotion: emotionLabel(previous.emotion), scene: previous.code ?? '' });
}

function Note({ children }: { children: string }) {
    return <p className="rounded-md border border-primary/25 bg-primary/10 p-2.5 text-warning">{children}</p>;
}
