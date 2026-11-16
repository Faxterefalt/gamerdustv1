import { Brain, Compass, Footprints, HeartHandshake, MessageSquare, Swords, type LucideIcon } from 'lucide-react';
import { __ } from '../../shared/lib/i18n';

export type MechanicKind = 'decision' | 'exploration' | 'resource';
export type MechanicIcon = 'footsteps' | 'dialogue' | 'mind' | 'combat' | 'exploration' | 'trust';

export interface Mechanic {
    id: number;
    project_id: number;
    title: string;
    kind: MechanicKind;
    icon: MechanicIcon;
    description: string | null;
    activation: string | null;
    narrative_effect: string | null;
    playable_actions: string | null;
    restrictions: string | null;
    conflict: string | null;
    scene_ids: number[];
    character_ids: number[];
}

export interface SceneReference {
    id: number;
    title: string;
    order: number;
}

export interface CharacterReference {
    id: number;
    name: string;
}

// Claves de traducción (Mechanic::KINDS).
const KIND_LABELS: Record<MechanicKind, string> = { decision: 'Decision', exploration: 'Exploration', resource: 'Resource' };

export const MECHANIC_KINDS = Object.keys(KIND_LABELS) as MechanicKind[];

export const mechanicKindLabel = (kind: string) => __(KIND_LABELS[kind as MechanicKind] ?? kind);

// Iconos disponibles (Mechanic::ICONS) con su etiqueta traducible.
export const MECHANIC_ICONS: { value: MechanicIcon; label: string; icon: LucideIcon }[] = [
    { value: 'footsteps', label: 'Stealth', icon: Footprints },
    { value: 'dialogue', label: 'Dialogue', icon: MessageSquare },
    { value: 'mind', label: 'Wit', icon: Brain },
    { value: 'combat', label: 'Combat', icon: Swords },
    { value: 'exploration', label: 'Exploration', icon: Compass },
    { value: 'trust', label: 'Trust', icon: HeartHandshake },
];

export const mechanicIcon = (icon: string | null | undefined): LucideIcon => MECHANIC_ICONS.find((item) => item.value === icon)?.icon ?? Footprints;
