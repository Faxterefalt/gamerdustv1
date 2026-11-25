import { ArrowRight, ChevronRight, Plus, Search, type LucideIcon } from 'lucide-react';
import { __ } from '../../../shared/lib/i18n';
import { secondary } from '../../../shared/lib/styles';

export interface CatalogItem {
    id: number;
    title: string;
    subtitle: string;
    icon: LucideIcon;
    /** Sangría (lugares dentro de otros lugares). */
    depth?: number;
    /** Cabecera de grupo: se muestra cuando cambia respecto al elemento anterior. */
    group?: string | null;
}

/**
 * Columna de catálogo de la Biblia (lugares, reglas): búsqueda, botón de alta y lista seleccionable.
 */
export default function EntryCatalog({
    label,
    count,
    query,
    onQuery,
    searchLabel,
    addLabel,
    onAdd,
    items,
    selectedId,
    onSelect,
    disabled,
    empty,
    footnote,
}: {
    label: string;
    count: number;
    query: string;
    onQuery: (value: string) => void;
    searchLabel: string;
    addLabel: string;
    onAdd: () => void;
    items: CatalogItem[];
    selectedId: number | null;
    onSelect: (id: number) => void;
    disabled: boolean;
    empty: string;
    footnote?: string;
}) {
    return (
        <aside aria-label={label} className="overflow-hidden rounded-xl border border-border bg-surface lg:sticky lg:top-[calc(var(--header-h)+1rem)]">
            <div className="border-b border-border p-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-display text-base">{label}</h2>
                    <span className="text-xs text-primary">{String(count).padStart(2, '0')}</span>
                </div>
                <label className="mt-4 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2.5">
                    <Search size={14} className="shrink-0 text-muted" />
                    <input aria-label={searchLabel} value={query} onChange={(event) => onQuery(event.target.value)} placeholder={`${searchLabel}…`} className="w-full min-w-0 bg-transparent text-xs" />
                </label>
                <button type="button" disabled={disabled} onClick={onAdd} className={`${secondary} mt-3 w-full justify-between !text-xs`}>
                    <span className="flex items-center gap-2">
                        <Plus size={14} />
                        {addLabel}
                    </span>
                    <ArrowRight size={14} />
                </button>
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto p-2.5 lg:max-h-[calc(100dvh-380px)]">
                {items.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = selectedId === item.id;
                    const showGroup = item.group && item.group !== items[index - 1]?.group;

                    return (
                        <div key={item.id}>
                            {showGroup && <p className="px-3 pb-1.5 pt-3 text-xs text-muted">{item.group}</p>}
                            <button
                                type="button"
                                disabled={disabled}
                                onClick={() => onSelect(item.id)}
                                aria-pressed={isActive}
                                style={{ marginLeft: `${(item.depth ?? 0) * 14}px`, width: `calc(100% - ${(item.depth ?? 0) * 14}px)` }}
                                className={`flex items-center gap-3 rounded-md border px-3 py-3 text-left transition ${isActive ? 'border-primary/25 bg-primary/10 text-primary' : 'border-transparent text-muted hover:border-border hover:bg-surface'}`}
                            >
                                <Icon size={18} strokeWidth={1.5} className="shrink-0" />
                                <span className="min-w-0 flex-1">
                                    <span className="block break-words text-xs font-medium">{item.title}</span>
                                    <span className="mt-1 block text-xs text-muted">{item.subtitle}</span>
                                </span>
                                <ChevronRight size={13} className="shrink-0" />
                            </button>
                        </div>
                    );
                })}
                {!items.length && <p className="px-3 py-8 text-center text-xs leading-6 text-muted">{query ? __('No matches.') : empty}</p>}
            </div>
            {footnote && <p className="border-t border-border px-4 py-3 text-xs leading-5 text-muted">{footnote}</p>}
        </aside>
    );
}
