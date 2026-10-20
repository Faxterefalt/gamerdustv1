import type { ReactNode } from 'react';
import { field } from '../../../shared/lib/styles';
import { GENRE_OPTIONS, LANGUAGE_OPTIONS, NARRATIVE_TYPE_OPTIONS } from '../projectOptions';
import type { NarrativeType } from '../projects.types';

export interface GeneralData {
    title: string;
    game_genre: string;
    language: string;
    narrative_type: NarrativeType;
    premise: string;
}

interface GeneralFieldsProps {
    data: GeneralData;
    setData: <K extends keyof GeneralData>(key: K, value: GeneralData[K]) => void;
    errors: Partial<Record<keyof GeneralData, string>>;
    idPrefix: string;
    extraGenre?: string | null;
}

export const GENERAL_REQUIRED_MESSAGE = 'Este campo es obligatorio.';

export function validateGeneral(data: GeneralData): Partial<Record<keyof GeneralData, string>> {
    const errors: Partial<Record<keyof GeneralData, string>> = {};
    (['title', 'game_genre', 'language', 'narrative_type'] as const).forEach((key) => {
        if (!data[key].trim()) errors[key] = GENERAL_REQUIRED_MESSAGE;
    });
    if (data.title.length > 255) errors.title = 'El nombre no puede superar los 255 caracteres.';
    if (data.premise.length > 2000) errors.premise = 'La premisa no puede superar los 2000 caracteres.';
    return errors;
}

export default function GeneralFields({ data, setData, errors, idPrefix, extraGenre }: GeneralFieldsProps) {
    const selectedType = NARRATIVE_TYPE_OPTIONS.find((type) => type.value === data.narrative_type);
    const genres: string[] = [...GENRE_OPTIONS];
    if (extraGenre && !genres.includes(extraGenre)) genres.push(extraGenre);

    return (
        <div className="space-y-4">
            <Row id={`${idPrefix}-title`} label="Nombre del proyecto" required error={errors.title}>
                <input
                    id={`${idPrefix}-title`}
                    maxLength={255}
                    value={data.title}
                    onChange={(event) => setData('title', event.target.value)}
                    placeholder="Ej. Dustfall Protocol"
                    className={field}
                />
            </Row>

            <div className="grid gap-4 sm:grid-cols-3">
                <Row id={`${idPrefix}-genre`} label="Género del videojuego" required error={errors.game_genre}>
                    <select id={`${idPrefix}-genre`} value={data.game_genre} onChange={(event) => setData('game_genre', event.target.value)} className={field}>
                        <option value="">Selecciona un género</option>
                        {genres.map((option) => (
                            <option key={option}>{option}</option>
                        ))}
                    </select>
                </Row>
                <Row id={`${idPrefix}-language`} label="Idioma del proyecto" required error={errors.language}>
                    <select id={`${idPrefix}-language`} value={data.language} onChange={(event) => setData('language', event.target.value)} className={field}>
                        <option value="">Selecciona un idioma</option>
                        {LANGUAGE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </Row>
                <Row id={`${idPrefix}-type`} label="Tipo de narrativa" required error={errors.narrative_type}>
                    <select id={`${idPrefix}-type`} value={data.narrative_type} onChange={(event) => setData('narrative_type', event.target.value as NarrativeType)} className={field}>
                        {NARRATIVE_TYPE_OPTIONS.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </Row>
            </div>
            {selectedType && <p className="-mt-2 text-xs text-[#98a58e]">{selectedType.help}</p>}

            <Row id={`${idPrefix}-premise`} label="Premisa inicial" optional error={errors.premise}>
                <textarea
                    id={`${idPrefix}-premise`}
                    rows={3}
                    maxLength={2000}
                    value={data.premise}
                    onChange={(event) => setData('premise', event.target.value)}
                    placeholder="Ej. Una archivista debe reconstruir la memoria de una colonia antes de que su mito fundador se derrumbe."
                    className={`${field} resize-y leading-6`}
                />
            </Row>
        </div>
    );
}

function Row({ id, label, required, optional, error, children }: { id: string; label: string; required?: boolean; optional?: boolean; error?: string; children: ReactNode }) {
    return (
        <div>
            <label className="block text-sm" htmlFor={id}>
                {label} {required && <span className="text-primary">*</span>}
                {optional && <span className="ml-2 text-xs text-[#74816b]">Opcional</span>}
            </label>
            {children}
            {error && <p className="mt-1 text-sm text-[#f0b4a0]">{error}</p>}
        </div>
    );
}
