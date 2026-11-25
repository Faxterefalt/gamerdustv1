import { __ } from '../../../shared/lib/i18n';
import type { Project } from '../projects.types';

interface ProjectStatsProps {
    project: Project;
}

export default function ProjectStats({ project }: ProjectStatsProps) {
    const stats = [
        ['Lore', project.lore_entries_count ?? project.lore_entries?.length ?? 0],
        [__('Characters'), project.characters_count ?? project.characters?.length ?? 0],
        [__('Scenes'), project.scenes_count ?? project.scenes?.length ?? 0],
        [__('Dialogues'), project.dialogue_nodes_count ?? project.dialogue_nodes?.length ?? 0],
    ];

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(([label, value]) => (
                <div key={label} className="border border-border bg-surface px-4 py-3">
                    <div className="text-sm text-muted">{label}</div>
                    <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
                </div>
            ))}
        </div>
    );
}
