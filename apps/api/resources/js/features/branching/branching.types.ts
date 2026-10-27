import type { EmotionalAnalysis } from '../analysis/emotion.types';
import type { DialogueType } from '../dialogues/dialogues.types';

export interface GraphOption {
    id: number;
    next_dialogue_node_id: number | null;
    player_option: string;
    consequence: string | null;
    required_condition: string | null;
    managed: boolean;
}

export interface GraphNode {
    id: number;
    node_key: string;
    title: string | null;
    display_title: string;
    text: string;
    dialogue_type: DialogueType;
    scene_id: number | null;
    scene_title: string | null;
    character_id: number | null;
    character_name: string | null;
    emotional_tone: string | null;
    trigger_condition: string | null;
    pos_x: number | null;
    pos_y: number | null;
    is_start: boolean;
    options: GraphOption[];
}

export interface GraphEdge {
    id: string;
    option_id: number;
    source: number;
    target: number;
    label: string;
    managed: boolean;
}

export type WarningCode = 'broken_option' | 'isolated' | 'no_incoming' | 'no_outgoing';

export interface GraphWarning {
    node_id: number;
    code: WarningCode;
    severity: 'error' | 'warning' | 'info';
    message: string;
}

export interface BranchingGraph {
    project_id: number;
    start_node_id: number | null;
    nodes: GraphNode[];
    edges: GraphEdge[];
    warnings: GraphWarning[];
    scenes: { id: number; title: string }[];
    characters: { id: number; name: string }[];
}

export type NodePatch = Partial<
    Pick<GraphNode, 'title' | 'text' | 'scene_id' | 'character_id' | 'dialogue_type' | 'emotional_tone' | 'trigger_condition'>
>;

export type OptionPatch = Partial<Pick<GraphOption, 'player_option' | 'next_dialogue_node_id' | 'consequence' | 'required_condition'>>;

export interface SyncSummary {
    created_nodes: { id: number; title: string }[];
    created_options: number;
    updated_options: number;
    removed_options: { id: number; player_option: string }[];
}

export interface BrokenOption {
    option_id: number;
    source_node_id: number;
    source_title: string;
    player_option: string;
    managed: boolean;
}

export interface SaveResponse {
    node_id?: number;
    option_id?: number;
    graph: BranchingGraph;
    sync?: SyncSummary;
    renamed?: { id: number; title: string }[];
    broken_options?: BrokenOption[];
}

export interface NodeContext {
    node: { id: number; title: string };
    scene: { id: number; title: string; summary?: string | null; conflict?: string | null; expected_emotion?: string | null } | null;
    character: { id: number; name: string; motivation?: string | null; speech_style?: string | null } | null;
    options: { id: number; player_option: string; consequence: string | null; required_condition: string | null; target: string | null }[];
    lore: { id: number; title: string; type?: string | null }[];
}

export interface AnalysisResponse {
    analysis: EmotionalAnalysis;
    context: NodeContext;
}

export interface ContextResponse {
    context: NodeContext;
    analyses: EmotionalAnalysis[];
}

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';
