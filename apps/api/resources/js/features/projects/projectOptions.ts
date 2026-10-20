import type { NarrativeType, ProjectStatus } from './projects.types';

export type UiLang = 'es' | 'en';

export const GENRE_OPTIONS = ['Aventura', 'RPG', 'Novela visual', 'Aventura gráfica', 'Acción-aventura', 'Otro'] as const;
export const LANGUAGE_OPTIONS = [
    { value: 'Español', label: 'Español' },
    { value: 'English', label: 'Inglés' },
] as const;

export const NARRATIVE_TYPE_OPTIONS: { value: NarrativeType; label: string; help: string }[] = [
    { value: 'linear', label: 'Lineal', help: 'Historia con una secuencia principal sin bifurcaciones narrativas.' },
    { value: 'balanced', label: 'Balanceada', help: 'Historia principal definida con decisiones y variaciones que pueden converger.' },
    { value: 'branching', label: 'Ramificada', help: 'Decisiones que permiten diferentes recorridos o desenlaces.' },
];

const dictionary = {
    es: {
        status: { draft: 'Borrador', in_progress: 'En progreso', completed: 'Completado' },
        narrative: { linear: 'Lineal', balanced: 'Balanceada', branching: 'Ramificada' },
        // Legacy identifiers still present in older records.
        legacyNarrative: { game_story: 'Lineal', player_story: 'Ramificada', balanced_narrative: 'Balanceada' },
        genres: {} as Record<string, string>,
        premise: 'Premisa',
        conflict: 'Conflicto principal',
        noDescription: 'Sin descripción todavía.',
    },
    en: {
        status: { draft: 'Draft', in_progress: 'In progress', completed: 'Completed' },
        narrative: { linear: 'Linear', balanced: 'Balanced', branching: 'Branching' },
        legacyNarrative: { game_story: 'Linear', player_story: 'Branching', balanced_narrative: 'Balanced' },
        genres: {
            Aventura: 'Adventure',
            'Novela visual': 'Visual novel',
            'Aventura gráfica': 'Graphic adventure',
            'Acción-aventura': 'Action-adventure',
            Otro: 'Other',
        } as Record<string, string>,
        premise: 'Premise',
        conflict: 'Main conflict',
        noDescription: 'No description yet.',
    },
};

export const uiLang = (language?: string | null): UiLang => (language === 'English' ? 'en' : 'es');

export const statusLabel = (status: ProjectStatus | string, lang: UiLang) =>
    (dictionary[lang].status as Record<string, string>)[status] ?? status;

export const narrativeLabel = (type: string, lang: UiLang) =>
    (dictionary[lang].narrative as Record<string, string>)[type] ?? (dictionary[lang].legacyNarrative as Record<string, string>)[type] ?? type;

export const genreLabel = (genre: string, lang: UiLang) => dictionary[lang].genres[genre] ?? genre;

export const summaryText = (key: 'premise' | 'conflict' | 'noDescription', lang: UiLang) => dictionary[lang][key];
