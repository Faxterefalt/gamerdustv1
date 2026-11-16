import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { __ } from '../lib/i18n';

/**
 * Pide confirmación antes de abandonar la página con cambios sin guardar:
 * cierre/recarga de la pestaña y navegaciones GET de Inertia (los POST/PUT del propio editor no se bloquean).
 */
export default function useUnsaved(dirty: boolean) {
    useEffect(() => {
        if (!dirty) {
            return;
        }

        const unload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        const removeInertia = router.on('before', (event) => {
            if (event.detail.visit.method !== 'get') {
                return;
            }

            if (!window.confirm(__('You have unsaved changes. Do you want to leave without saving them?'))) {
                event.preventDefault();
            }
        });

        window.addEventListener('beforeunload', unload);

        return () => {
            window.removeEventListener('beforeunload', unload);
            removeInertia();
        };
    }, [dirty]);
}
