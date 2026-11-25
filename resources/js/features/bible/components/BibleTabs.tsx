import { Link } from '@inertiajs/react';
import { MapPin, ScrollText, Sparkles, UserRound } from 'lucide-react';
import { __ } from '../../../shared/lib/i18n';

export type BibleTab = 'essence' | 'characters' | 'locations' | 'rules';

/**
 * Pestañas de la Biblia Narrativa: esencia del proyecto, personajes, lugares y reglas del mundo.
 */
export default function BibleTabs({ projectId, active }: { projectId: number; active: BibleTab }) {
    const base = `/projects/${projectId}`;
    const tabs = [
        { key: 'essence', label: __('Essence'), href: `${base}/bible`, icon: Sparkles },
        { key: 'characters', label: __('Characters'), href: `${base}/characters`, icon: UserRound },
        { key: 'locations', label: __('Places'), href: `${base}/bible/locations`, icon: MapPin },
        { key: 'rules', label: __('World rules'), href: `${base}/bible/rules`, icon: ScrollText },
    ] as const;

    return (
        <nav aria-label={__('Narrative Bible sections')} className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
            {tabs.map(({ key, label, href, icon: Icon }) => (
                <Link
                    key={key}
                    href={href}
                    aria-current={active === key ? 'page' : undefined}
                    className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs transition ${active === key ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}
                >
                    <Icon size={14} />
                    {label}
                </Link>
            ))}
        </nav>
    );
}
