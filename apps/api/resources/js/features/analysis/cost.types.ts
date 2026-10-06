export type CostLevel = 'low' | 'medium' | 'high';

export interface CostEstimation {
    id: number;
    project_id: number;
    costable_type?: string | null;
    costable_id?: number | null;
    cost_level: CostLevel;
    cost_score: number;
    cost_factors?: string[] | null;
    explanation?: string | null;
}
