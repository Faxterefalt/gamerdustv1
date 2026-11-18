import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export type LockType = 'scene' | 'node';

/** Otra persona que está editando el mismo elemento. */
export interface LockHolder {
    id: number;
    name: string;
    since: string | null;
}

interface LockResponse {
    holder: LockHolder | null;
    heartbeat_seconds: number;
    lock_seconds: number;
}

/** Hasta que el servidor diga otra cosa (config/gamerdust.php → collaboration.heartbeat_seconds). */
const FIRST_HEARTBEAT_SECONDS = 20;

/**
 * Bloqueo blando (HU 26): mientras el elemento está abierto envía un latido y devuelve quién más lo
 * edita (o null). No impide guardar: el 409 del servidor sigue protegiendo los cambios. Al cambiar
 * de elemento, desmontar o cerrar la pestaña lo suelta; si el latido falla, el aviso se oculta.
 */
export default function useEditLock(projectId: number, type: LockType, id: number | null, enabled: boolean): LockHolder | null {
    const [holder, setHolder] = useState<LockHolder | null>(null);

    useEffect(() => {
        if (!enabled || id === null) {
            setHolder(null);

            return;
        }

        let stopped = false;
        let timer: number | undefined;
        const body = { type, id };

        const beat = async (): Promise<void> => {
            let seconds = FIRST_HEARTBEAT_SECONDS;

            try {
                const response = await api<LockResponse>('POST', `/projects/${projectId}/locks`, body);
                seconds = response.heartbeat_seconds || seconds;

                if (!stopped) {
                    setHolder(response.holder);
                }
            } catch {
                // Sin red o sin permiso: no se muestra nada (el guardado sigue avisando si hay conflicto).
                if (!stopped) {
                    setHolder(null);
                }
            }

            if (!stopped) {
                timer = window.setTimeout(() => void beat(), seconds * 1000);
            }
        };

        const release = () => {
            void api('POST', `/projects/${projectId}/locks/release`, body, { keepalive: true }).catch(() => undefined);
        };

        void beat();
        window.addEventListener('pagehide', release);

        return () => {
            stopped = true;
            window.clearTimeout(timer);
            window.removeEventListener('pagehide', release);
            release();
            setHolder(null);
        };
    }, [projectId, type, id, enabled]);

    return holder;
}
