import type { Character } from './character';
import type { Scene } from './scene';

export type DialogueType =
    | 'cutscene'
    | 'ambient'
    | 'bark'
    | 'interactive_no_branch'
    | 'interactive_rubber_banding'
    | 'interactive_alternative_paths';

export interface DialogueOption {
    id?: number;
    dialogue_node_id?: number;
    next_dialogue_node_id?: number | null;
    player_option: string;
    consequence?: string | null;
    required_condition?: string | null;
    next_dialogue_node?: Pick<DialogueNode, 'id' | 'node_key'> | null;
}

export interface DialogueNode {
    id: number;
    project_id: number;
    scene_id?: number | null;
    character_id?: number | null;
    node_key: string;
    dialogue_type: DialogueType;
    text: string;
    emotional_tone?: string | null;
    trigger_condition?: string | null;
    scene?: Pick<Scene, 'id' | 'title'> | null;
    character?: Pick<Character, 'id' | 'name'> | null;
    options?: DialogueOption[];
}
