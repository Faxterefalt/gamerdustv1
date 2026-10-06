export interface EmotionalAnalysis {
    id: number;
    project_id: number;
    analyzable_type?: string | null;
    analyzable_id?: number | null;
    input_text: string;
    dominant_emotion: string;
    valence?: string | number | null;
    arousal?: string | number | null;
    dominance?: string | number | null;
    emotion_scores?: Record<string, number> | null;
    interpretation?: string | null;
    suggestions?: string[] | null;
}
