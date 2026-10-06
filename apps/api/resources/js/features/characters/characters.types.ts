export interface Character {
    id: number;
    project_id: number;
    name: string;
    role?: string | null;
    archetype?: string | null;
    age?: number | null;
    gender?: string | null;
    background?: string | null;
    personality?: string | null;
    speech_style?: string | null;
    motivation?: string | null;
    fear?: string | null;
    desire?: string | null;
    emotional_arc?: string | null;
    visual_description?: string | null;
    voice_notes?: string | null;
}
