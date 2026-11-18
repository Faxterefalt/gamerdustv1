/** Comentario tal como lo devuelve Comment::toPayload(). */
export interface ProjectComment {
    id: number;
    user_id: number | null;
    scene_id: number | null;
    scene_title: string | null;
    author: string;
    text: string;
    created_at: string | null;
}

export type MemberRole = 'admin' | 'editor' | 'viewer';

/** Miembro tal como lo devuelve StudioController@collaboration (el dueño va primero, sin id). */
export interface ProjectMemberRow {
    id: number | null;
    user_id: number;
    name: string | null;
    email: string | null;
    role: MemberRole | 'owner';
    created_at: string | null;
}
