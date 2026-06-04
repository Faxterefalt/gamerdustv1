export type ValidationSeverity = 'low' | 'medium' | 'high';

export interface NarrativeValidation {
    id: number;
    project_id: number;
    validation_type: string;
    severity: ValidationSeverity;
    message: string;
    recommendation?: string | null;
    resolved: boolean;
}
