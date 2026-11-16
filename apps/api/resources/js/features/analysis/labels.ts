import { __ } from '../../shared/lib/i18n';

// Claves de traducción (inglés) para los identificadores que devuelven los servicios de análisis.
const EMOTION_LABELS: Record<string, string> = { joy: 'Joy', fear: 'Fear', anger: 'Anger', sadness: 'Sadness', tension: 'Tension' };

const SEVERITY_LABELS: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High' };

export const emotionLabel = (emotion: string) => __(EMOTION_LABELS[emotion] ?? emotion);

export const severityLabel = (severity: string) => __(SEVERITY_LABELS[severity] ?? severity);
