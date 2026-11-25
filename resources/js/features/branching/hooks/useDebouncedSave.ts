import { useCallback, useEffect, useMemo, useRef } from 'react';

/**
 * Agrupa guardados: `schedule()` reinicia el temporizador y `flush()` ejecuta de inmediato.
 * Al desmontar con un guardado pendiente se ejecuta para no perder cambios.
 */
export function useDebouncedSave(save: () => Promise<void> | void, delay = 800) {
    const saveRef = useRef(save);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        saveRef.current = save;
    });

    const flush = useCallback(async () => {
        if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
        }

        await saveRef.current();
    }, []);

    const schedule = useCallback(() => {
        if (timer.current) {
            clearTimeout(timer.current);
        }

        timer.current = setTimeout(() => {
            timer.current = null;
            void saveRef.current();
        }, delay);
    }, [delay]);

    useEffect(
        () => () => {
            if (timer.current) {
                clearTimeout(timer.current);
                timer.current = null;
                void saveRef.current();
            }
        },
        [],
    );

    return useMemo(() => ({ schedule, flush }), [schedule, flush]);
}
