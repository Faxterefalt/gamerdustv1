import { __ } from '../../shared/lib/i18n';

export type MechanicKind = 'decision' | 'exploration' | 'resource';

export interface Mechanic {
    id: number;
    project_id: number;
    title: string;
    kind: MechanicKind;
    description: string | null;
    activation: string | null;
    narrative_effect: string | null;
}

// Claves de traducción (Mechanic::KINDS).
const KIND_LABELS: Record<MechanicKind, string> = { decision: 'Decision', exploration: 'Exploration', resource: 'Resource' };

export const MECHANIC_KINDS = Object.keys(KIND_LABELS) as MechanicKind[];

export const mechanicKindLabel = (kind: string) => __(KIND_LABELS[kind as MechanicKind] ?? kind);
