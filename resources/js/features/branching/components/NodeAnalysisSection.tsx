import { __, choice } from '../../../shared/lib/i18n';
import { Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { AlertTriangle, Brain, RefreshCw } from 'lucide-react';
import { api, ApiError } from '../../../shared/lib/api';
import { EmotionChip, Evidence, NarrativeLine } from '../../analysis/components/EmotionBits';
import FeedbackButtons from '../../analysis/components/FeedbackButtons';
import type { EmotionCatalog } from '../../analysis/emotion.types';
import { severityLabel, suggestionKindLabel } from '../../analysis/labels';
import type { ContextResponse, NodeAnalysis, NodeContext } from '../branching.types';
import { secondary } from '../../../shared/lib/styles';

interface NodeAnalysisSectionProps {
    projectId: number;
    nodeId: number;
    catalog: EmotionCatalog;
    beforeAnalyze: () => Promise<void>;
}

/**
 * Análisis emocional del nodo (HU 45). La IA solo se llama al pulsar el botón; el resultado es una
 * lectura revisable: nunca modifica el texto, las opciones ni las conexiones.
 */
export default function NodeAnalysisSection({ projectId, nodeId, catalog, beforeAnalyze }: NodeAnalysisSectionProps) {
    const [context, setContext] = useState<NodeContext | null>(null);
    const [analysis, setAnalysis] = useState<NodeAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        setContext(null);
        setAnalysis(null);
        setError(null);

        api<ContextResponse>('GET', `/projects/${projectId}/branching/nodes/${nodeId}/context`)
            .then((response) => {
                if (active) {
                    setContext(response.context);
                    setAnalysis(response.analysis);
                }
            })
            .catch(() => undefined);

        return () => {
            active = false;
        };
    }, [projectId, nodeId]);

    const analyze = async (force: boolean) => {
        setLoading(true);
        setError(null);

        try {
            // Se analiza el texto guardado: primero se guardan los borradores pendientes.
            await beforeAnalyze();
            const response = await api<{ analysis: NodeAnalysis }>('POST', `/projects/${projectId}/branching/nodes/${nodeId}/analyze`, { force });
            setAnalysis(response.analysis);
        } catch (caught) {
            setError(caught instanceof ApiError && caught.status === 429 ? __('AI is busy, try again in a minute') : caught instanceof Error ? caught.message : __('Could not analyze.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="space-y-2 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">{__('Emotional analysis')}</h3>
                <button
                    type="button"
                    onClick={() => void analyze(Boolean(analysis))}
                    disabled={loading}
                    className={secondary}
                >
                    {analysis ? <RefreshCw size={13} /> : <Brain size={13} />} {loading ? __('Analyzing...') : analysis ? __('Reanalyze') : __('Analyze emotions')}
                </button>
            </div>

            {context && (
                <p className="text-xs text-subtle">
                    {__('Context: :scene, :character, :options, :lore.', {
                        scene: context.scene ? __('scene ":title"', { title: context.scene.title }) : __('no scene'),
                        character: context.character ? __('character :name', { name: context.character.name }) : __('no character'),
                        options: choice(':count option|:count options', context.options.length),
                        lore: choice(':count lore entry|:count lore entries', context.lore.length),
                    })}
                </p>
            )}

            {error && <p className="text-xs text-danger">{error}</p>}

            {analysis && (
                <div className="space-y-3 border border-border bg-background p-3 text-xs text-muted">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <EmotionChip emotion={analysis.emotion} catalog={catalog} size="sm" />
                        <span className="text-xs text-subtle">
                            {analysis.source === 'groq' ? __('AI') : __('Keywords')}
                            {analysis.from_cache && ` · ${__('saved analysis')}`}
                        </span>
                    </div>
                    {analysis.stale && <p className="text-sm text-warning">{__('The node or its context changed after this analysis. Reanalyze to update it.')}</p>}
                    {analysis.degraded && <p className="text-xs text-primary">{__('The AI did not respond: this is the keyword analysis. Try again in a minute.')}</p>}
                    <NarrativeLine labels={analysis.labels} vad={analysis.vad} technical={false} />
                    {analysis.summary && <p className="text-muted">{analysis.summary}</p>}
                    <Evidence text={analysis.evidence} />
                    {analysis.flow.explanation && (
                        <p className={analysis.flow.justified === false ? 'text-primary' : 'text-muted'}>
                            {analysis.flow.justified === false && <AlertTriangle size={12} className="mr-1 inline" />}
                            {analysis.flow.explanation}
                        </p>
                    )}

                    {analysis.speaker && (
                        <div className="space-y-1 border-t border-border pt-2">
                            <p className="flex items-center gap-2 text-foreground">
                                {analysis.speaker.name} <EmotionChip emotion={analysis.speaker.emotion} catalog={catalog} size="sm" />
                            </p>
                            <NarrativeLine labels={analysis.speaker.labels} vad={analysis.speaker.vad} technical={false} withControl />
                            {analysis.speaker.out_of_character && (
                                <p className="text-danger">
                                    {__('Out of character')}: {analysis.speaker.out_of_character_reason}
                                </p>
                            )}
                        </div>
                    )}

                    {analysis.inconsistencies.length > 0 && (
                        <ul className="space-y-1.5 border-t border-border pt-2">
                            {analysis.inconsistencies.map((item, index) => (
                                <li key={index} className="text-danger">
                                    <span className="text-xs text-danger">{severityLabel(item.severity)}</span> {item.explanation}{' '}
                                    {item.url ? (
                                        <Link href={item.url} className="underline">
                                            {item.contradicts}
                                        </Link>
                                    ) : (
                                        item.contradicts && <em>{item.contradicts}</em>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    {analysis.suggestions.length > 0 && (
                        <ul className="space-y-2 border-t border-border pt-2">
                            {analysis.suggestions.map((suggestion, index) => (
                                <li key={index} className="text-foreground">
                                    <span className="text-xs text-primary">{suggestionKindLabel(suggestion.kind)}</span> {suggestion.text}
                                    {suggestion.why && <span className="block text-xs text-subtle">{suggestion.why}</span>}
                                    <div className="mt-1 flex justify-end">
                                        <FeedbackButtons key={analysis.id} projectId={projectId} target={{ emotional_analysis_id: analysis.id }} index={index} initial={analysis.feedback[index] ?? null} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="text-xs text-subtle">{__('These are suggestions to review: they do not modify the text, options or connections.')}</p>
                </div>
            )}
        </section>
    );
}
