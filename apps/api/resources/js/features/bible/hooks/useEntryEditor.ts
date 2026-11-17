import type { FormDataType } from '@inertiajs/core';
import { router, useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import useUnsaved from '../../../shared/hooks/useUnsaved';
import { __ } from '../../../shared/lib/i18n';

/** Props que devuelven las páginas de fichas tras guardar: el servidor redirige a `?<param>=<id>`. */
interface SheetPageProps<E> {
    entries: E[];
    selected: number | null;
}

/**
 * Estado del editor de fichas de la Biblia (personajes, lugares, reglas): selección, borrador,
 * cambios sin guardar, guardado y borrado. Las props del servidor son la fuente de verdad.
 */
export default function useEntryEditor<E extends { id: number }, D extends FormDataType<D>>({
    url,
    entries,
    selected,
    startNew = false,
    draftOf,
    nameOf,
}: {
    /** Ruta de la colección (POST para crear, `/{id}` para editar o borrar). */
    url: string;
    entries: E[];
    selected: number | null;
    /** Abrir con una ficha vacía en lugar de la primera. */
    startNew?: boolean;
    draftOf: (entry: E | null) => D;
    nameOf: (entry: E) => string;
}) {
    const [selectedId, setSelectedId] = useState<number | null>(startNew ? null : (selected ?? entries[0]?.id ?? null));
    const initial = draftOf(entries.find((entry) => entry.id === selectedId) ?? null);
    const form = useForm<D>(initial);
    const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
    const [saved, setSaved] = useState(false);

    const active = entries.find((entry) => entry.id === selectedId) ?? null;
    const dirty = JSON.stringify(form.data) !== baseline;
    useUnsaved(dirty);

    /** Carga una ficha (o un borrador vacío) y la toma como referencia de "sin cambios". */
    const load = (entry: E | null) => {
        const next = draftOf(entry);
        setSelectedId(entry?.id ?? null);
        form.setData(next);
        form.clearErrors();
        setBaseline(JSON.stringify(next));
        setSaved(false);
    };

    const choose = (entry: E | null) => {
        if (dirty && !confirm(__('Discard unsaved changes?'))) return;
        load(entry);
    };

    const update = <K extends keyof D>(key: K, value: D[K]) => {
        form.setData((data) => ({ ...data, [key]: value }));
        setSaved(false);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        // POST con _method=PUT: permite enviar archivos (multipart) también al editar.
        form.transform((data) => (active ? { ...data, _method: 'put' } : data));
        form.post(active ? `${url}/${active.id}` : url, {
            preserveScroll: true,
            onSuccess: (page) => {
                const props = page.props as unknown as SheetPageProps<E>;
                const record = props.entries.find((entry) => entry.id === props.selected);
                if (record) {
                    load(record);
                    setSaved(true);
                }
            },
        });
    };

    const destroy = () => {
        if (!active || !confirm(__('Delete ":name"?', { name: nameOf(active) }))) return;
        router.delete(`${url}/${active.id}`, {
            preserveScroll: true,
            onSuccess: (page) => load((page.props as unknown as SheetPageProps<E>).entries[0] ?? null),
        });
    };

    const cancel = () => choose(active);

    return { form, active, selectedId, dirty, saved, choose, cancel, update, submit, destroy };
}
