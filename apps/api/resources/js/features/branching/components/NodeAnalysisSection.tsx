import { __, choice } from '../../../shared/lib/i18n';
import { useEffect, useState } from 'react';
import { Brain } from 'lucide-react';
import { api } from '../../../shared/lib/api';
import type { AnalysisResponse, ContextResponse, NodeContext } from '../branching.types';
import type { EmotionalAnalysis } from '../../analysis/emotion.types';
import { emotionLabel } from '../../analysis/labels';

interface NodeAnalysisSectionProps {
    projectId: number;
    nodeId: number;
    beforeAnalyze: () => Promise<void>;
}

/**
 * Muestra contexto y resultado del análisis emocional existente. Es solo lectura: no aplica cambios al nodo.
 */
export default function NodeAnalysisSection({ projectId, nodeId, beforeAnalyze }: NodeAnalysisSectionProps) {
    const [context, setContext] = useState<NodeContext | null>(null);
    const [analysis, setAnalysis] = useState<EmotionalAnalysis | null>(null);
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
                    setAnalysis(response.analyses[0] ?? null);
                }
            })
            .catch(() => undefined);

        return () => {
            active = false;
        };
    }, [projectId, nodeId]);

    const analyze = async () => {
        setLoading(true);
        setError(null);

        try {
            await beforeAnalyze();
            const response = await api<AnalysisResponse>('POST', `/projects/${projectId}/branching/nodes/${nodeId}/analysis`);
            setAnalysis(response.analysis);
            setContext(response.context);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : __('Could not analyze.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="space-y-2 border-t border-zinc-800 pt-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">{__('Emotional analysis')}</h3>
                <button type="button" onClick={analyze} disabled={loading} className="flex items-center gap-1.5 border border-fuchsia-800 px-2.5 py-1 text-xs text-fuchsia-200 hover:bg-fuchsia-950 disabled:opacity-50">
                    <Brain size={13} /> {loading ? __('Analyzing...') : __('Analyze')}
                </button>
            </div>

            {context && (
                <p className="text-xs text-zinc-500">
                    {__('Context: :scene, :character, :options, :lore.', {
                        scene: context.scene ? __('scene ":title"', { title: context.scene.title }) : __('no scene'),
                        character: context.character ? __('character :name', { name: context.character.name }) : __('no character'),
                        options: choice(':count option|:count options', context.options.length),
                        lore: choice(':count lore entry|:count lore entries', context.lore.length),
                    })}
                </p>
            )}

            {error && <p className="text-xs text-rose-300">{error}</p>}

            {analysis && (
                <div className="space-y-2 border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
                    <p>
                        {__('Dominant emotion:')} <strong className="text-white">{emotionLabel(analysis.dominant_emotion)}</strong>
                    </p>
                    {analysis.interpretation && <p className="text-zinc-400">{analysis.interpretation}</p>}
                    {analysis.suggestions && analysis.suggestions.length > 0 && (
                        <ul className="list-disc space-y-1 pl-4 text-amber-200">
                            {analysis.suggestions.map((suggestion) => (
                                <li key={suggestion}>{suggestion}</li>
                            ))}
                        </ul>
                    )}
                    <p className="text-[10px] text-zinc-500">{__('These are suggestions to review: they do not modify the text, options or connections.')}</p>
                </div>
            )}
        </section>
    );
}
