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
    limits?: string | null;
    /** Emoción con la que empieza la historia (clave de config/gamerdust.php). */
    initial_emotion?: string | null;
    initial_intensity?: 'low' | 'medium' | 'high' | null;
}

/** Ficha del personaje en la Biblia (Character::toSheetPayload). */
export interface CharacterSheet extends Character {
    image_url: string | null;
    scene_ids: number[];
}

/** Sugerencias de rol (el rol es texto libre). Claves de traducción en inglés. */
export const ROLE_SUGGESTIONS = ['Protagonist', 'Antagonist', 'Ally', 'Mentor', 'Secondary', 'Neutral'];
