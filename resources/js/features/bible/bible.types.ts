import { Building2, Car, Castle, DoorOpen, Map, Mountain, Trees, type LucideIcon } from 'lucide-react';
import { __ } from '../../shared/lib/i18n';
import type { LoreType } from '../lore/lore.types';
import type { Project } from '../projects/projects.types';

export type LocationType = 'interior' | 'exterior' | 'city' | 'region' | 'building' | 'nature' | 'vehicle';
export type RuleCategory = 'society' | 'magic' | 'technology' | 'physics' | 'religion' | 'economy';
export type Rigidity = 'unbreakable' | 'costly' | 'flexible';
export type RuleScope = 'linked' | 'global';
export type CharacterRole = 'breaks' | 'enforces';

export interface LinkedCharacter {
    id: number;
    role: CharacterRole | null;
}

/** Ficha de lugar o de regla tal como la envía BibleEntryController (LoreEntry::toBiblePayload). */
export interface BibleEntry {
    id: number;
    project_id: number;
    title: string;
    type: LoreType;
    subtype: string | null;
    parent_id: number | null;
    description: string | null;
    narrative_function: string | null;
    emotional_tone: string | null;
    access: string | null;
    statement: string | null;
    rigidity: Rigidity | null;
    scope: RuleScope | null;
    origin: string | null;
    consequence: string | null;
    exceptions: string | null;
    characters: LinkedCharacter[];
    scene_ids: number[];
    location_ids: number[];
    rule_ids: number[];
    lore_ids: number[];
    mechanic_ids: number[];
}

export interface BibleSceneReference {
    id: number;
    title: string;
    order: number;
    location_id: number | null;
}

export interface Reference {
    id: number;
    title: string;
}

export interface LoreReference extends Reference {
    type: LoreType;
}

/** Props comunes de las páginas de lugares y reglas. */
export interface BibleEntryPageProps {
    project: Project;
    entries: BibleEntry[];
    selected: number | null;
    scenes: BibleSceneReference[];
    characters: { id: number; name: string }[];
    lore: LoreReference[];
    mechanics: Reference[];
}

// Claves de traducción (inglés) de cada opción.
export const LOCATION_TYPES: { value: LocationType; label: string; icon: LucideIcon }[] = [
    { value: 'interior', label: 'Interior', icon: DoorOpen },
    { value: 'exterior', label: 'Exterior', icon: Trees },
    { value: 'city', label: 'City', icon: Building2 },
    { value: 'region', label: 'Region', icon: Map },
    { value: 'building', label: 'Building', icon: Castle },
    { value: 'nature', label: 'Natural area', icon: Mountain },
    { value: 'vehicle', label: 'Vehicle', icon: Car },
];

export const RULE_CATEGORIES: { value: RuleCategory; label: string }[] = [
    { value: 'society', label: 'Society and law' },
    { value: 'magic', label: 'Magic and powers' },
    { value: 'technology', label: 'Technology' },
    { value: 'physics', label: 'Physics of the world' },
    { value: 'religion', label: 'Religion and myths' },
    { value: 'economy', label: 'Economy' },
];

export const RIGIDITIES: { value: Rigidity; label: string; hint: string }[] = [
    { value: 'unbreakable', label: 'Unbreakable', hint: 'It is never broken; breaking it would be a script error.' },
    { value: 'costly', label: 'Breakable at a cost', hint: 'It can be broken if there is a consequence.' },
    { value: 'flexible', label: 'Flexible', hint: 'A custom or belief; it allows nuances.' },
];

export const RULE_SCOPES: { value: RuleScope; label: string }[] = [
    { value: 'linked', label: 'Only in the linked places' },
    { value: 'global', label: 'The whole world' },
];

export const CHARACTER_ROLES: { value: CharacterRole; label: string }[] = [
    { value: 'breaks', label: 'breaks it' },
    { value: 'enforces', label: 'enforces it' },
];

const labelOf = (options: { value: string; label: string }[], value: string | null | undefined) => {
    const option = options.find((item) => item.value === value);

    return option ? __(option.label) : null;
};

export const locationTypeLabel = (value: string | null | undefined) => labelOf(LOCATION_TYPES, value);
export const ruleCategoryLabel = (value: string | null | undefined) => labelOf(RULE_CATEGORIES, value);
export const rigidityLabel = (value: string | null | undefined) => labelOf(RIGIDITIES, value);
export const locationTypeIcon = (value: string | null | undefined) => LOCATION_TYPES.find((item) => item.value === value)?.icon ?? Map;
