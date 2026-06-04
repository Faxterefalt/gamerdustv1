import type { Project } from '../../types/project';

interface ProjectStatsProps {
    project: Project;
}

export default function ProjectStats({ project }: ProjectStatsProps) {
    const stats = [
        ['Lore', project.lore_entries_count ?? project.lore_entries?.length ?? 0],
        ['Personajes', project.characters_count ?? project.characters?.length ?? 0],
        ['Escenas', project.scenes_count ?? project.scenes?.length ?? 0],
        ['Dialogos', project.dialogue_nodes_count ?? project.dialogue_nodes?.length ?? 0],
    ];

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(([label, value]) => (
                <div key={label} className="border border-zinc-800 bg-zinc-900 px-4 py-3">
                    <div className="text-sm text-zinc-400">{label}</div>
                    <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
                </div>
            ))}
        </div>
    );
}
