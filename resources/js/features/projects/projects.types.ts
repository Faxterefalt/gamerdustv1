import type { Character } from '../characters/characters.types';
import type { CostEstimation } from '../analysis/cost.types';
import type { DialogueNode } from '../dialogues/dialogues.types';
import type { EmotionalAnalysis } from '../analysis/emotion.types';
import type { LoreEntry } from '../lore/lore.types';
import type { Scene } from '../scenes/scenes.types';

export type ProjectStatus = 'draft' | 'in_progress' | 'completed';
export type NarrativeType = 'linear' | 'branching' | 'balanced';

export interface UserSummary {
    id: number;
    name: string;
    email: string;
}

/** Rol del usuario en el proyecto actual (HandleInertiaRequests → projectAccess). */
export type ProjectRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface ProjectAccess {
    role: ProjectRole | null;
    can_update: boolean;
    can_manage: boolean;
    is_owner: boolean;
}

export interface PageProps {
    locale?: string;
    projectAccess?: ProjectAccess | null;
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
    narrative_genre?: string | null;
    central_theme?: string | null;
    setting?: string | null;
    player_objective?: string | null;
    expected_outcome?: string | null;
    assignment?: string | null;
    /** Restricciones de producción: null = sin límite. */
    max_characters?: number | null;
    max_pages?: number | null;
    /** En puntos de coste narrativo (heurística), no en dinero. */
    max_budget?: number | string | null;
    requires_twist?: boolean;
}

/** Consumo actual frente a las restricciones (ProductionUsage). */
export interface ConstraintUsage {
    characters: number;
    words: number;
    pages: number;
    words_per_page: number;
    cost_points: number;
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
    branching_enabled?: boolean;
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
    cost_estimations?: CostEstimation[];
    /** Solo en la lista de proyectos: rol del usuario y dueño si es compartido. */
    role?: ProjectRole;
    owner?: string | null;
    lore_entries_count?: number;
    characters_count?: number;
    scenes_count?: number;
    dialogue_nodes_count?: number;
}
