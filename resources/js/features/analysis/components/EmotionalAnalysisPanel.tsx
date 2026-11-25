import { __ } from '../../../shared/lib/i18n';
import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import type { DialogueNode } from '../../dialogues/dialogues.types';
import type { EmotionalAnalysis } from '../emotion.types';
import { emotionLabel } from '../labels';
import type { Scene } from '../../scenes/scenes.types';

interface EmotionalAnalysisPanelProps {
    projectId: number;
    analysis?: EmotionalAnalysis | null;
    scenes?: Scene[];
    dialogues?: DialogueNode[];
}

export default function EmotionalAnalysisPanel({ projectId, analysis, scenes = [], dialogues = [] }: EmotionalAnalysisPanelProps) {
    const { data, setData, post, processing } = useForm<{ source_type: 'scene' | 'dialogue'; source_id: number | '' }>({
        source_type: 'scene',
        source_id: scenes[0]?.id ?? dialogues[0]?.id ?? '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        post(`/projects/${projectId}/emotional-analysis`);
    };

    const sources = data.source_type === 'scene' ? scenes : dialogues;

    return (
        <section className="border border-border bg-surface p-4">
            <div className="flex flex-col gap-1">
                <h2 className="font-semibold text-foreground">{__('Emotional analysis')}</h2>
                <p className="text-sm text-muted">{__('Local keyword-based placeholder, ready to connect AI later.')}</p>
            </div>

            {analysis ? (
                <div className="mt-4 space-y-2 text-sm text-muted">
                    <div>
                        {__('Dominant emotion:')} <span className="text-primary">{emotionLabel(analysis.dominant_emotion)}</span>
                    </div>
                    {analysis.interpretation && <p>{analysis.interpretation}</p>}
                </div>
            ) : (
                <p className="mt-4 text-sm text-muted">{__('No saved analyses yet.')}</p>
            )}

            <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[160px_1fr_auto]">
                <select
                    value={data.source_type}
                    onChange={(event) => {
                        const sourceType = event.target.value as 'scene' | 'dialogue';
                        const first = sourceType === 'scene' ? scenes[0]?.id : dialogues[0]?.id;
                        setData({ source_type: sourceType, source_id: first ?? '' });
                    }}
                    className="border border-border-strong bg-background px-3 py-2 text-sm"
                >
                    <option value="scene">{__('Scene')}</option>
                    <option value="dialogue">{__('Dialogue')}</option>
                </select>
                <select
                    value={data.source_id}
                    onChange={(event) => setData('source_id', event.target.value ? Number(event.target.value) : '')}
                    className="border border-border-strong bg-background px-3 py-2 text-sm"
                >
                    {sources.map((source) => (
                        <option key={source.id} value={source.id}>
                            {'title' in source ? source.title : source.node_key}
                        </option>
                    ))}
                </select>
                <button type="submit" disabled={processing || sources.length === 0} className="border border-primary px-4 py-2 text-sm text-foreground hover:bg-primary/10 disabled:opacity-50">
                    {__('Analyze')}
                </button>
            </form>
        </section>
    );
}
