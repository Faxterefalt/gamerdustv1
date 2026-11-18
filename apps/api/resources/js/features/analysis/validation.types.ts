export type ValidationSeverity = 'low' | 'medium' | 'high' | 'review';

export type ValidationStatus = 'pending' | 'resolved' | 'dismissed';

/** Elemento afectado por la alerta (evidencia), con enlace a donde se corrige. */
export interface ValidationSubject {
    kind: 'character' | 'scene' | 'rule' | 'location' | 'lore' | 'characters' | 'script' | 'brief';
    label: string;
    url: string;
}

/** NarrativeValidation::toPayload. */
export interface NarrativeValidation {
    id: number;
    project_id: number;
    validation_type: string;
    severity: ValidationSeverity;
    message: string;
    recommendation?: string | null;
    status: ValidationStatus;
    updated_at: string | null;
    subject: ValidationSubject | null;
}
