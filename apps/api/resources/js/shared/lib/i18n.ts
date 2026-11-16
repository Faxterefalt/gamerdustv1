/**
 * Traducciones del frontend. Equivalente a `__()` / `trans_choice()` de Laravel:
 * la clave es el texto en inglés y `lang/<locale>.json` contiene su traducción.
 * Si no hay traducción (p. ej. en inglés) se muestra la propia clave.
 *
 * El idioma activo lo decide el servidor (middleware SetLocale) y llega en `<html lang>`.
 * Cambiar de idioma recarga la página (ver LocaleSwitcher), así que es constante durante la sesión de la SPA.
 */
const catalogs = import.meta.glob<Record<string, string>>('../../../../lang/*.json', { eager: true, import: 'default' });

export type Locale = 'es' | 'en';

export const LOCALES: { code: Locale; label: string }[] = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
];

export const locale: Locale = typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('en') ? 'en' : 'es';

const messages: Record<string, string> = catalogs[`../../../../lang/${locale}.json`] ?? {};

type Replacements = Record<string, string | number>;

function replace(text: string, replacements?: Replacements): string {
    if (!replacements) {
        return text;
    }

    return text.replace(/:(\w+)/g, (match, name: string) => (name in replacements ? String(replacements[name]) : match));
}

/** `__('Edit :name', { name })` */
export function __(key: string, replacements?: Replacements): string {
    return replace(messages[key] ?? key, replacements);
}

/** `choice(':count scene|:count scenes', total)`: singular|plural, con `:count` disponible. */
export function choice(key: string, count: number, replacements?: Replacements): string {
    const forms = (messages[key] ?? key).split('|');

    return replace(forms[count === 1 ? 0 : forms.length - 1], { count, ...replacements });
}
