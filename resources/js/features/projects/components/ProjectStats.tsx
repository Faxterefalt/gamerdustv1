import { __ } from '../../../shared/lib/i18n';
import type { Project } from '../projects.types';

interface ProjectStatsProps {
    project: Project;
}

/** Recuento del proyecto como un HUD: cifras en pixel, separadas por reglas finas (sin tarjetas). */
export default function ProjectStats({ project }: ProjectStatsProps) {
    const stats = [
        [__('Lore'), project.lore_entries_count ?? project.lore_entries?.length ?? 0],
        [__('Characters'), project.characters_count ?? project.characters?.length ?? 0],
        [__('Scenes'), project.scenes_count ?? project.scenes?.length ?? 0],
        [__('Dialogues'), project.dialogue_nodes_count ?? project.dialogue_nodes?.length ?? 0],
    ] as const;

    return (
        <dl className="grid grid-cols-2 border-y border-border sm:grid-cols-4">
            {stats.map(([label, value], index) => (
                <div key={label} className={`flex flex-col-reverse gap-1 py-4 ${index % 2 ? 'border-l border-border pl-4' : ''} ${index >= 2 ? 'border-t border-border sm:border-t-0' : ''} ${index === 2 ? 'sm:border-l sm:pl-4' : ''}`}>
                    <dt className="text-sm text-muted">{label}</dt>
                    <dd className="text-hud font-pixel text-foreground">{value}</dd>
                </div>
            ))}
        </dl>
    );
}
