export type LoreType = 'rule' | 'history' | 'faction' | 'location' | 'object' | 'event' | 'concept';

export interface LoreEntry {
    id: number;
    project_id: number;
    title: string;
    type: LoreType;
    description?: string | null;
    narrative_function?: string | null;
    emotional_tone?: string | null;
}
