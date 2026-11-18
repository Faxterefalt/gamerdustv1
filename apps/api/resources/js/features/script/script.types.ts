export type BlockKind = 'heading' | 'action' | 'character' | 'dialogue' | 'parenthetical';

export interface ScriptBlock {
    id: string;
    kind: BlockKind;
    text: string;
}

/** Escena tal como la presenta ScriptService::present(). */
export interface ScriptScene {
    id: number;
    title: string;
    act: string | null;
    order: number;
    script: ScriptBlock[];
    character_ids: number[];
    location_id: number | null;
    /** Token de concurrencia: se reenvía al guardar. */
    updated_at: string | null;
    /** Última versión guardada: segundo token (updated_at solo tiene segundos). */
    version_id: number | null;
}

export interface ScriptVersion {
    id: number;
    title: string;
    script: ScriptBlock[];
    author: string | null;
    created_at: string | null;
}

export interface NamedReference {
    id: number;
    name: string;
}

export interface LocationReference {
    id: number;
    title: string;
}

/** Código visible de cada escena (E01, E02...) según su orden en el proyecto. */
export function sceneCodes(scenes: Pick<ScriptScene, 'id' | 'order'>[]): Map<number, string> {
    return new Map([...scenes].sort((a, b) => a.order - b.order || a.id - b.id).map((scene, index) => [scene.id, `E${String(index + 1).padStart(2, '0')}`]));
}

export function sceneText(scene: Pick<ScriptScene, 'script'>): string {
    return scene.script
        .map((block) => block.text)
        .filter(Boolean)
        .join(' ')
        .trim();
}

export function countWords(value: string): number {
    return value.trim().split(/\s+/u).filter(Boolean).length;
}
