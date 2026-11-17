import { Link } from '@inertiajs/react';
import { HeartPulse, LoaderCircle, RefreshCw, Sparkles, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormError } from '../../../shared/components/ui';
import { api, ApiError } from '../../../shared/lib/api';
import { __, locale } from '../../../shared/lib/i18n';
import { primarySm, secondary } from '../../../shared/lib/styles';
import { ChangeAlert, EmotionChip, Evidence, NarrativeLine } from '../../analysis/components/EmotionBits';
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
export default function EmotionPanel({ projectId, sceneId, sceneCode, dirty, catalog, pendingAnalyze, onConsumed, onClose }: EmotionPanelProps) {
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
            className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[400px] flex-col border-l border-border bg-[#151d16] text-foreground shadow-[0_0_45px_rgba(0,0,0,.45)]"
        >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
                <div>
                    <p className="font-mono text-[8px] tracking-[.17em] text-[#9fb592]">{__('EMOTIONAL ANALYSIS')} · {sceneCode}</p>
                    <h2 className="mt-1 flex items-center gap-2 font-display text-lg">
                        <HeartPulse size={17} className="text-primary" /> {__('How this scene feels')}
                    </h2>
                </div>
                <button type="button" onClick={onClose} aria-label={__('Close panel')} className="rounded p-2 text-[#aebea3] hover:bg-white/5">
                    <X size={17} />
                </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
                <label className="flex cursor-pointer items-center gap-2 text-[10px] text-[#a9bb9d]">
                    <input type="checkbox" checked={technical} onChange={toggleTechnical} className="accent-[#c5ec95]" />
                    {__('Technical mode')}
                </label>
                {analysis ? (
                    <button type="button" disabled={busy} onClick={() => analyze(true)} className={`${secondary} !min-h-9 !text-[10px]`}>
                        <RefreshCw size={13} /> {__('Reanalyze')}
                    </button>
                ) : (
                    <button type="button" disabled={busy} onClick={() => analyze(false)} className={`${primarySm} !min-h-9 !py-2 !text-[10px]`}>
                        <Sparkles size={13} /> {__('Analyze emotions')}
                    </button>
                )}
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                {busy && (
                    <p role="status" className="flex items-center gap-2 text-xs text-primary">
                        <LoaderCircle size={14} className="animate-spin" /> {status === 'analyzing' ? __('Reading the scene…') : __('Loading…')}
                    </p>
                )}
                {warning && (
                    <p role="alert" className="rounded-md border border-amber-300/30 bg-amber-300/10 p-3 text-[11px] leading-5 text-[#f1d79a]">
                        {warning}
                    </p>
                )}
                <FormError error={error} />

                {!busy && !analysis && !error && (
                    <p className="text-xs leading-6 text-[#a6b99a]">
                        {__('No analysis yet for this scene. Press Analyze emotions: the AI reads the saved version with its characters, location and world rules.')}
                    </p>
                )}

                {analysis && <AnalysisView analysis={analysis} catalog={catalog} technical={technical} dateLocale={dateLocale} />}
            </div>

            <p className="border-t border-border px-5 py-3 text-[9px] leading-5 text-[#93a886]">{__('The AI only suggests: it never changes your script.')}</p>
        </aside>
    );
}

function AnalysisView({ analysis, catalog, technical, dateLocale }: { analysis: SceneEmotionAnalysis; catalog: EmotionCatalog; technical: boolean; dateLocale: string }) {
    const { scene } = analysis;

    return (
        <>
            <div className="space-y-2 text-[10px] leading-5 text-[#a2b697]">
                {analysis.created_at && <p>{__('Last analysis: :time', { time: new Date(analysis.created_at).toLocaleString(dateLocale) })}</p>}
                {analysis.stale && <Note>{__('The scene or its Bible sheets changed after this analysis. Reanalyze to update it.')}</Note>}
                {analysis.degraded && <Note>{__('AI is busy; showing a basic keyword analysis.')}</Note>}
                {analysis.source === 'keywords' && !analysis.degraded && <Note>{__('Basic keyword analysis: the AI connection is not configured.')}</Note>}
                {analysis.truncated && <Note>{__('The scene is long: only its first part was analyzed.')}</Note>}
                {technical && analysis.model && <p className="font-mono text-[9px]">{analysis.model}</p>}
            </div>

            <section className="space-y-3 rounded-lg border border-border bg-background/40 p-4">
                <EmotionChip emotion={scene.emotion} catalog={catalog} />
                <NarrativeLine labels={scene.labels} vad={scene.vad} technical={technical} />
                {scene.summary && <p className="text-xs leading-6 text-[#d3dfca]">{scene.summary}</p>}
                <Evidence text={scene.evidence} />
                {scene.change.alert && <p className="text-[10px] text-[#a2b697]">{previousLine(scene.change, true)}</p>}
                <ChangeAlert change={scene.change} />
            </section>

            {analysis.characters.length > 0 && (
                <section>
                    <h3 className="mb-3 text-[11px] font-medium text-[#dce6d5]">{__('Characters')}</h3>
                    <div className="space-y-3">
                        {analysis.characters.map((character) => (
                            <CharacterCard key={character.character_id} character={character} catalog={catalog} technical={technical} />
                        ))}
                    </div>
                </section>
            )}

            {analysis.inconsistencies.length > 0 && (
                <section>
                    <h3 className="mb-3 text-[11px] font-medium text-[#dce6d5]">{__('Inconsistencies with the lore')}</h3>
                    <ul className="space-y-3">
                        {analysis.inconsistencies.map((item, index) => (
                            <li key={index} className="rounded-lg border border-border p-3 text-[11px] leading-5">
                                <p className="flex flex-wrap items-center gap-2 text-[10px] text-[#a2b697]">
                                    <span className="rounded border border-border px-1.5 py-0.5">{__('Severity: :level', { level: severityLabel(item.severity) })}</span>
                                    {item.url ? (
                                        <Link href={item.url} className="text-primary underline">
                                            {item.contradicts}
                                        </Link>
                                    ) : (
                                        <span>{item.contradicts}</span>
                                    )}
                                </p>
                                <p className="mt-2 text-[#d3dfca]">{item.explanation}</p>
                                <Evidence text={item.fragment} />
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {analysis.suggestions.length > 0 && (
                <section>
                    <h3 className="mb-3 text-[11px] font-medium text-[#dce6d5]">{__('Suggestions')}</h3>
                    <ul className="space-y-3">
                        {analysis.suggestions.map((suggestion, index) => (
                            <li key={index} className="rounded-lg border border-dashed border-border p-3 text-[11px] leading-5">
                                <span className="font-mono text-[8px] tracking-wider text-primary">{suggestionKindLabel(suggestion.kind).toLocaleUpperCase()}</span>
                                <p className="mt-1 text-[#d3dfca]">{suggestion.text}</p>
                                {suggestion.why && <p className="mt-1 text-[10px] text-[#a2b697]">{suggestion.why}</p>}
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
            <p className="text-[10px] text-[#a2b697]">{previousLine(character.change, false)}</p>
            {character.out_of_character && (
                <div className="rounded-md border border-red-300/30 bg-red-400/10 p-2.5 text-[10px] leading-5 text-[#f3baa5]">
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
    return <p className="rounded-md border border-amber-300/25 bg-amber-300/5 p-2.5 text-[#e7d6a4]">{children}</p>;
}
