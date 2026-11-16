import { __ } from '../../shared/lib/i18n';
import type { LoreType } from './lore.types';

// Claves de traducción (inglés) de cada tipo de entrada de lore.
const LORE_TYPE_LABELS: Record<LoreType, string> = {
    rule: 'Rule',
    history: 'History',
    faction: 'Faction',
    location: 'Location',
    object: 'Object',
    event: 'Event',
    concept: 'Concept',
};

export const LORE_TYPES = Object.keys(LORE_TYPE_LABELS) as LoreType[];

export const loreTypeLabel = (type: string) => __(LORE_TYPE_LABELS[type as LoreType] ?? type);
