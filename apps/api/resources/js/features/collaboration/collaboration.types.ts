/** Comentario tal como lo devuelve Comment::toPayload(). */
export interface ProjectComment {
    id: number;
    scene_id: number | null;
    scene_title: string | null;
    author: string;
    text: string;
    created_at: string | null;
}
