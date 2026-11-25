/*
 * Clases reutilizables sobre los tokens de app.css (nada de hex aquí). Los controles miden 40 px y suben a 44 px
 * en pantallas táctiles (pointer-coarse). El foco lo pinta la regla global :focus-visible de app.css.
 */

/** Acción principal (landing, auth, formularios). */
export const button =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-primary-ink transition-colors hover:bg-primary-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50';

/** Campo de texto, select o textarea. Borde a 3,8:1 (WCAG 1.4.11) y 16 px para que iOS no haga zoom. */
export const field =
    'mt-2 min-h-10 w-full rounded-md border border-border-strong bg-background px-3 py-2 text-base text-foreground transition-colors hover:border-muted focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:min-h-11';

/** Acción secundaria con borde. */
export const secondary =
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm text-foreground transition-colors hover:border-primary/50 hover:bg-surface-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:min-h-11';

/** Botón principal compacto (estudio de proyecto). */
export const primarySm =
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-ink transition-colors hover:bg-primary-hover active:translate-y-px disabled:cursor-wait disabled:opacity-50 pointer-coarse:min-h-11';

/** Botón de solo icono (siempre con aria-label). */
export const iconButton =
    'inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:size-11';

/** Panel: superficie con borde fino (un solo nivel; nunca un panel dentro de otro). */
export const card = 'rounded-lg border border-border bg-surface';

/** Texto de ayuda bajo un campo. */
export const hint = 'mt-1 text-xs text-subtle';

/** Acento pixelado: logotipo, titulares de 1 a 3 palabras, cifras tipo HUD y códigos de escena. Nunca en párrafos ni formularios. */
export const pixel = 'font-pixel';

/** Palabra pixelada dentro de un titular (la firma de la marca). */
export const pixelAccent = 'font-pixel text-primary';

export const genres = ['Aventura', 'Fantasía oscura', 'Ciencia ficción', 'Misterio', 'Terror', 'Otro'];
