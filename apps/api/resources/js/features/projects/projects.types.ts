import type { Character } from '../characters/characters.types';
import type { CostEstimation } from '../analysis/cost.types';
import type { DialogueNode } from '../dialogues/dialogues.types';
import type { EmotionalAnalysis } from '../analysis/emotion.types';
import type { LoreEntry } from '../lore/lore.types';
import type { Scene } from '../scenes/scenes.types';
import type { NarrativeValidation } from '../analysis/validation.types';

export type ProjectStatus = 'draft' | 'in_progress' | 'completed';
export type NarrativeType = 'game_story' | 'balanced_narrative' | 'player_story';

export interface UserSummary {
    id: number;
    name: string;
    email: string;
}

export interface PageProps {
    auth: {
        user: UserSummary | null;
    };
    flash: {
        success?: string | null;
        error?: string | null;
    };
    [key: string]: unknown;
}

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface Paginated<T> {
    data: T[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
}

export interface ProjectConstraint {
    id?: number;
    project_id?: number;
    main_emotional_tone?: string | null;
    dominant_emotion?: string | null;
    secondary_emotions?: string[] | null;
    world_type?: string | null;
    player_role?: string | null;
    branching_level?: string | null;
    required_elements?: string[] | null;
    forbidden_elements?: string[] | null;
    creative_notes?: string | null;
}

export interface Project {
    id: number;
    user_id: number;
    title: string;
    description?: string | null;
    game_genre?: string | null;
    language?: string;
    favorite?: boolean;
    narrative_type: NarrativeType;
    premise?: string | null;
    central_conflict?: string | null;
    target_audience?: string | null;
    status: ProjectStatus;
    constraint?: ProjectConstraint | null;
    lore_entries?: LoreEntry[];
    characters?: Character[];
    scenes?: Scene[];
    dialogue_nodes?: DialogueNode[];
    emotional_analyses?: EmotionalAnalysis[];
    narrative_validations?: NarrativeValidation[];
    cost_estimations?: CostEstimation[];
    lore_entries_count?: number;
    characters_count?: number;
    scenes_count?: number;
    dialogue_nodes_count?: number;
}
