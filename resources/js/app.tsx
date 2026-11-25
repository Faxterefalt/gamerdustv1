import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { resolvePage } from './app/resolve-page';
import { token } from './shared/lib/tokens';

const appName = import.meta.env.VITE_APP_NAME || 'Gamerdust';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: resolvePage,
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: {
        color: token('primary'),
    },
});
