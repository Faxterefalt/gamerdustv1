import { __ } from '../../shared/lib/i18n';
import type { NarrativeType, ProjectStatus } from './projects.types';

// Las etiquetas de este archivo son claves de traducción (inglés); se traducen con __() al mostrarlas.

// Valores tal como se guardan en BD (StoreProjectRequest::GENRES).
export const GENRE_OPTIONS = ['Aventura', 'RPG', 'Novela visual', 'Aventura gráfica', 'Acción-aventura', 'Otro'] as const;

const GENRE_LABELS: Record<string, string> = {
    Aventura: 'Adventure',
    RPG: 'RPG',
    'Novela visual': 'Visual novel',
    'Aventura gráfica': 'Graphic adventure',
    'Acción-aventura': 'Action-adventure',
    Otro: 'Other',
};

// Idioma en el que se escribe la narrativa del proyecto (StoreProjectRequest::LANGUAGES), independiente del idioma de la interfaz.
export const LANGUAGE_OPTIONS = [
    { value: 'es', label: 'Spanish' },
    { value: 'en', label: 'English' },
] as const;

export const NARRATIVE_TYPE_OPTIONS: { value: NarrativeType; label: string; help: string }[] = [
    { value: 'linear', label: 'Linear', help: 'A story with one main sequence and no narrative forks.' },
    { value: 'balanced', label: 'Balanced', help: 'A defined main story with decisions and variations that can converge.' },
    { value: 'branching', label: 'Branching', help: 'Decisions that allow different paths or endings.' },
];

const STATUS_LABELS: Record<string, string> = { draft: 'Draft', in_progress: 'In progress', completed: 'Completed' };

const NARRATIVE_LABELS: Record<string, string> = {
    linear: 'Linear',
    balanced: 'Balanced',
    branching: 'Branching',
    // Identificadores antiguos que aún existen en registros viejos.
    game_story: 'Linear',
    player_story: 'Branching',
    balanced_narrative: 'Balanced',
};

export const statusLabel = (status: ProjectStatus | string) => __(STATUS_LABELS[status] ?? status);

export const narrativeLabel = (type: string) => __(NARRATIVE_LABELS[type] ?? type);

export const genreLabel = (genre: string) => __(GENRE_LABELS[genre] ?? genre);

export const languageLabel = (language: string) => __(LANGUAGE_OPTIONS.find((option) => option.value === language)?.label ?? language);
