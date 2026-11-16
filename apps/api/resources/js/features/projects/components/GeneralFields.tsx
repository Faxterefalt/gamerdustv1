import { __ } from '../../../shared/lib/i18n';
import type { ReactNode } from 'react';
import { field } from '../../../shared/lib/styles';
import { GENRE_OPTIONS, genreLabel, LANGUAGE_OPTIONS, NARRATIVE_TYPE_OPTIONS } from '../projectOptions';
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

export function validateGeneral(data: GeneralData): Partial<Record<keyof GeneralData, string>> {
    const errors: Partial<Record<keyof GeneralData, string>> = {};
    (['title', 'game_genre', 'language', 'narrative_type'] as const).forEach((key) => {
        if (!data[key].trim()) errors[key] = __('This field is required.');
    });
    if (data.title.length > 255) errors.title = __('The name may not be longer than 255 characters.');
    if (data.premise.length > 2000) errors.premise = __('The premise may not be longer than 2000 characters.');
    return errors;
}

export default function GeneralFields({ data, setData, errors, idPrefix, extraGenre }: GeneralFieldsProps) {
    const selectedType = NARRATIVE_TYPE_OPTIONS.find((type) => type.value === data.narrative_type);
    const genres: string[] = [...GENRE_OPTIONS];
    if (extraGenre && !genres.includes(extraGenre)) genres.push(extraGenre);

    return (
        <div className="space-y-4">
            <Row id={`${idPrefix}-title`} label={__('Project name')} required error={errors.title}>
                <input
                    id={`${idPrefix}-title`}
                    maxLength={255}
                    value={data.title}
                    onChange={(event) => setData('title', event.target.value)}
                    placeholder={__('E.g. Dustfall Protocol')}
                    className={field}
                />
            </Row>

            <div className="grid gap-4 sm:grid-cols-3">
                <Row id={`${idPrefix}-genre`} label={__('Video game genre')} required error={errors.game_genre}>
                    <select id={`${idPrefix}-genre`} value={data.game_genre} onChange={(event) => setData('game_genre', event.target.value)} className={field}>
                        <option value="">{__('Select a genre')}</option>
                        {genres.map((option) => (
                            <option key={option} value={option}>
                                {genreLabel(option)}
                            </option>
                        ))}
                    </select>
                </Row>
                <Row id={`${idPrefix}-language`} label={__('Project language')} required error={errors.language}>
                    <select id={`${idPrefix}-language`} value={data.language} onChange={(event) => setData('language', event.target.value)} className={field}>
                        <option value="">{__('Select a language')}</option>
                        {LANGUAGE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {__(option.label)}
                            </option>
                        ))}
                    </select>
                </Row>
                <Row id={`${idPrefix}-type`} label={__('Narrative type')} required error={errors.narrative_type}>
                    <select id={`${idPrefix}-type`} value={data.narrative_type} onChange={(event) => setData('narrative_type', event.target.value as NarrativeType)} className={field}>
                        {NARRATIVE_TYPE_OPTIONS.map((type) => (
                            <option key={type.value} value={type.value}>
                                {__(type.label)}
                            </option>
                        ))}
                    </select>
                </Row>
            </div>
            {selectedType && <p className="-mt-2 text-xs text-[#98a58e]">{__(selectedType.help)}</p>}

            <Row id={`${idPrefix}-premise`} label={__('Initial premise')} optional error={errors.premise}>
                <textarea
                    id={`${idPrefix}-premise`}
                    rows={3}
                    maxLength={2000}
                    value={data.premise}
                    onChange={(event) => setData('premise', event.target.value)}
                    placeholder={__('E.g. An archivist must rebuild the memory of a colony before its founding myth collapses.')}
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
                {optional && <span className="ml-2 text-xs text-[#74816b]">{__('Optional')}</span>}
            </label>
            {children}
            {error && <p className="mt-1 text-sm text-[#f0b4a0]">{error}</p>}
        </div>
    );
}
