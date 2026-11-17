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

/** Banda de una etiqueta narrativa: [límite superior exclusivo, clave i18n]; null = resto. */
export type LabelBand = [number | null, string];

/** Catálogo emocional que envía el servidor (EmotionTranslator::catalog). */
export interface EmotionCatalog {
    emotions: Record<string, { color: string }>;
    labels: { tone: LabelBand[]; tension: LabelBand[]; control: LabelBand[] };
    intensities: string[];
}
