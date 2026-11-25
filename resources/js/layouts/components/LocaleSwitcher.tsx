import { Languages } from 'lucide-react';
import { __, locale, LOCALES } from '../../shared/lib/i18n';

/**
 * Enlaces normales (no Inertia): /locale/{code} guarda la cookie y recarga la página ya traducida.
 * El código del idioma (ES/EN) es un identificador, no una etiqueta: por eso va en mayúsculas.
 */
export default function LocaleSwitcher({ className = '' }: { className?: string }) {
    return (
        <div role="group" aria-label={__('Language')} className={`flex items-center gap-1 text-sm ${className}`}>
            <Languages size={16} aria-hidden="true" className="text-subtle" />
            {LOCALES.map(({ code, label }) =>
                code === locale ? (
                    <span key={code} title={label} aria-current="true" className="inline-flex min-h-11 min-w-9 items-center justify-center font-bold text-primary">
                        {code.toUpperCase()}
                    </span>
                ) : (
                    <a key={code} href={`/locale/${code}`} title={label} lang={code} className="inline-flex min-h-11 min-w-9 items-center justify-center text-muted hover:text-foreground">
                        {code.toUpperCase()}
                    </a>
                ),
            )}
        </div>
    );
}
