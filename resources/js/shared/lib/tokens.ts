/**
 * Colores del sistema de diseño para librerías que pintan SVG o canvas (Recharts, React Flow, la barra de
 * progreso de Inertia) y no aceptan clases de Tailwind. Lee las variables `--color-*` que `@theme static`
 * de app.css emite en :root, así que el valor siempre es el del token (nunca un hex suelto en TS).
 * En `style={{ ... }}` basta con `cssVar('primary')`; en atributos SVG (`stroke`, `fill`) usa `token('primary')`.
 */
const cache = new Map<string, string>();

export type ColorToken =
    | 'background'
    | 'surface'
    | 'surface-2'
    | 'surface-3'
    | 'border'
    | 'border-strong'
    | 'foreground'
    | 'muted'
    | 'subtle'
    | 'primary'
    | 'primary-ink'
    | 'ember'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'scrim'
    | 'kind-cutscene'
    | 'kind-ambient'
    | 'kind-bark'
    | 'kind-linear'
    | 'kind-rubber'
    | 'kind-paths';

/** Valor resuelto del token (p. ej. "oklch(0.84 0.13 128)"); cadena vacía fuera del navegador. */
export function token(name: ColorToken): string {
    if (typeof document === 'undefined') {
        return '';
    }

    const cached = cache.get(name);

    if (cached) {
        return cached;
    }

    const value = getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();

    if (value) {
        cache.set(name, value);
    }

    return value;
}

/** Referencia CSS al token, para propiedades de `style`. */
export const cssVar = (name: ColorToken) => `var(--color-${name})`;
