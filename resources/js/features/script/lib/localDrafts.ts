import type { ScriptBlock } from '../script.types';

/** Lo que se guarda en el navegador de cada escena con cambios sin guardar (HU 24). */
export interface LocalDraft {
    snapshot: { elements: ScriptBlock[]; characters: number[]; location: number | null };
    /** updated_at de la escena en el servidor cuando se empezó el borrador. */
    base_updated_at: string | null;
    /** Momento del último cambio guardado en el navegador (ms). */
    saved_at: number;
}

const PREFIX = 'gamerdust:script-draft';

/** Por usuario y escena: en un navegador compartido cada cuenta ve solo sus borradores. */
const keyOf = (userId: number, sceneId: number) => `${PREFIX}:${userId}:${sceneId}`;

/**
 * Borradores locales del guion. localStorage puede no existir o fallar (modo privado, cuota llena):
 * todas las operaciones capturan el error y devuelven si funcionaron.
 */
export const localDrafts = {
    read(userId: number, sceneId: number): LocalDraft | null {
        try {
            const raw = window.localStorage.getItem(keyOf(userId, sceneId));
            const draft = raw ? (JSON.parse(raw) as LocalDraft) : null;

            return draft && Array.isArray(draft.snapshot?.elements) && typeof draft.saved_at === 'number' ? draft : null;
        } catch {
            return null;
        }
    },

    write(userId: number, sceneId: number, draft: LocalDraft): boolean {
        try {
            window.localStorage.setItem(keyOf(userId, sceneId), JSON.stringify(draft));

            return true;
        } catch {
            return false;
        }
    },

    remove(userId: number, sceneId: number): void {
        try {
            window.localStorage.removeItem(keyOf(userId, sceneId));
        } catch {
            // Sin almacenamiento no hay nada que borrar.
        }
    },
};
