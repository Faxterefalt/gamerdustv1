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

/** Valores internos (0-1): solo se muestran en el modo técnico. */
export interface Vad {
    v: number;
    a: number;
    d: number;
}

export type EmotionAlert = 'red' | 'amber' | null;

/** Etiquetas narrativas ya traducidas por el servidor. */
export interface NarrativeLabels {
    tone: string;
    tension: string;
    control: string;
}

export interface EmotionChange {
    abrupt: boolean;
    alert: EmotionAlert;
    explanation: string;
    previous: { origin: 'author' | 'ai' | 'none'; emotion: string | null; scene_id: number | null; code: string | null } | null;
}

export interface CharacterEmotion {
    character_id: number;
    name: string;
    emotion: string;
    labels: NarrativeLabels;
    vad: Vad;
    evidence: string;
    out_of_character: boolean;
    out_of_character_reason: string;
    change: EmotionChange;
}

/** Análisis de escena (SceneEmotionService::present). */
export interface SceneEmotionAnalysis {
    id: number;
    created_at: string | null;
    from_cache: boolean;
    stale: boolean;
    source: 'groq' | 'keywords';
    model: string | null;
    degraded: boolean;
    truncated: boolean;
    scene: { emotion: string; labels: NarrativeLabels; vad: Vad; summary: string; evidence: string; change: EmotionChange };
    characters: CharacterEmotion[];
    inconsistencies: { fragment: string; contradicts: string; explanation: string; severity: string; url: string | null }[];
    suggestions: { kind: string; text: string; why: string }[];
}
