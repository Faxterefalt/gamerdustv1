export interface Scene {
    id: number;
    project_id: number;
    title: string;
    order: number;
    summary?: string | null;
    conflict?: string | null;
    expected_emotion?: string | null;
    interest_level?: number | null;
    scene_type?: string | null;
    player_decision?: string | null;
    consequence?: string | null;
    estimated_cost?: string | null;
    dialogue_nodes_count?: number;
}
