import { usePage } from '@inertiajs/react';
import type { PageProps, ProjectAccess } from '../../features/projects/projects.types';

/** Sin proyecto en la ruta (o sin sesión) se asume acceso completo: el servidor decide igualmente. */
const FULL: ProjectAccess = { role: 'owner', can_update: true, can_manage: true, is_owner: true };

/**
 * Rol del usuario en el proyecto de la página (HU 5), compartido por HandleInertiaRequests.
 * Solo sirve para ocultar acciones: la autorización real está en ProjectPolicy.
 */
export default function useProjectAccess(): ProjectAccess {
    return usePage<PageProps>().props.projectAccess ?? FULL;
}
