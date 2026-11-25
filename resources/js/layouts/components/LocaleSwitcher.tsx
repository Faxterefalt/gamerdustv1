import { Languages } from 'lucide-react';
import { __, locale, LOCALES } from '../../shared/lib/i18n';

/**
 * Enlaces normales (no Inertia): /locale/{code} guarda la cookie y recarga la página ya traducida.
 */
export default function LocaleSwitcher({ className = '' }: { className?: string }) {
    return (
        <div role="group" aria-label={__('Language')} className={`flex items-center gap-2 text-xs ${className}`}>
            <Languages size={14} className="text-subtle" />
            {LOCALES.map(({ code, label }) =>
                code === locale ? (
                    <span key={code} title={label} aria-current="true" className="text-primary">
                        {code.toUpperCase()}
                    </span>
                ) : (
                    <a key={code} href={`/locale/${code}`} title={label} lang={code} className="text-muted hover:text-foreground">
                        {code.toUpperCase()}
                    </a>
                ),
            )}
        </div>
    );
}
