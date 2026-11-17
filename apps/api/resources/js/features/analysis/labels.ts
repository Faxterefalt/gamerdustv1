import { __ } from '../../shared/lib/i18n';

// Claves de traducción (inglés) para los identificadores que devuelven los servicios de análisis.
// La lista de emociones y sus colores llegan del servidor (config/gamerdust.php); aquí solo sus etiquetas.
const EMOTION_LABELS: Record<string, string> = {
    joy: 'Joy',
    hope: 'Hope',
    tenderness: 'Tenderness',
    calm: 'Calm',
    surprise: 'Surprise',
    neutral: 'Neutral',
    anxiety: 'Anxiety',
    fear: 'Fear',
    sadness: 'Sadness',
    guilt: 'Guilt',
    anger: 'Anger',
    disgust: 'Disgust',
    // Análisis simulado antiguo.
    tension: 'Tension',
};

const SEVERITY_LABELS: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High' };

const INTENSITY_LABELS: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High' };

const SUGGESTION_LABELS: Record<string, string> = { emotion: 'Emotion', coherence: 'Coherence', pacing: 'Pacing', conflict: 'Conflict' };

export const emotionLabel = (emotion: string) => __(EMOTION_LABELS[emotion] ?? emotion);

export const severityLabel = (severity: string) => __(SEVERITY_LABELS[severity] ?? severity);

export const intensityLabel = (intensity: string) => __(INTENSITY_LABELS[intensity] ?? intensity);

export const suggestionKindLabel = (kind: string) => __(SUGGESTION_LABELS[kind] ?? kind);
