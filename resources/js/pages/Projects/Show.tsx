import { Head, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import AppShell from '../../components/gamerdust/AppShell';
import CharacterCard from '../../components/gamerdust/CharacterCard';
import ConstraintForm from '../../components/gamerdust/ConstraintForm';
import DialogueNodeCard from '../../components/gamerdust/DialogueNodeCard';
import EmotionalAnalysisPanel from '../../components/gamerdust/EmotionalAnalysisPanel';
import LoreEntryCard from '../../components/gamerdust/LoreEntryCard';
import NarrativeValidationPanel from '../../components/gamerdust/NarrativeValidationPanel';
import ProjectStats from '../../components/gamerdust/ProjectStats';
import SceneCard from '../../components/gamerdust/SceneCard';
import type { Project } from '../../types/project';

interface ProjectShowProps {
    project: Project;
}

export default function Show({ project }: ProjectShowProps) {
    const latestAnalysis = project.emotional_analyses?.[0] ?? null;

    return (
        <AppShell
            title={project.title}
            actions={
                <div className="flex flex-wrap gap-2">
                    <Link href={`/projects/${project.id}/edit`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                        Editar
                    </Link>
                    <Link href="/projects" className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                        Proyectos
                    </Link>
                </div>
            }
        >
            <Head title={project.title} />

            <div className="space-y-6">
                <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                    <div className="border border-zinc-800 bg-zinc-900 p-5">
                        <div className="flex flex-wrap gap-2 text-xs text-zinc-300">
                            <span className="border border-zinc-700 px-2 py-1">{project.status}</span>
                            <span className="border border-zinc-700 px-2 py-1">{project.narrative_type}</span>
                            {project.game_genre && <span className="border border-zinc-700 px-2 py-1">{project.game_genre}</span>}
                        </div>
                        <p className="mt-4 text-zinc-300">{project.description || 'Sin descripcion todavia.'}</p>
                        {project.premise && (
                            <div className="mt-5">
                                <h2 className="text-sm font-semibold text-amber-200">Premisa</h2>
                                <p className="mt-2 text-sm text-zinc-300">{project.premise}</p>
                            </div>
                        )}
                        {project.central_conflict && (
                            <div className="mt-5">
                                <h2 className="text-sm font-semibold text-rose-200">Conflicto central</h2>
                                <p className="mt-2 text-sm text-zinc-300">{project.central_conflict}</p>
                            </div>
                        )}
                    </div>
                    <ProjectStats project={project} />
                </section>

                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <ConstraintForm projectId={project.id} constraint={project.constraint} />
                    <NarrativeValidationPanel projectId={project.id} validations={project.narrative_validations ?? []} />
                </div>

                <EmotionalAnalysisPanel projectId={project.id} analysis={latestAnalysis} scenes={project.scenes ?? []} dialogues={project.dialogue_nodes ?? []} />

                <QuickLinks projectId={project.id} />

                <DashboardSection title="Lore reciente" href={`/projects/${project.id}/lore`} createHref={`/projects/${project.id}/lore/create`}>
                    {(project.lore_entries ?? []).map((entry) => (
                        <LoreEntryCard key={entry.id} entry={entry} />
                    ))}
                </DashboardSection>

                <DashboardSection title="Personajes" href={`/projects/${project.id}/characters`} createHref={`/projects/${project.id}/characters/create`}>
                    {(project.characters ?? []).map((character) => (
                        <CharacterCard key={character.id} character={character} />
                    ))}
                </DashboardSection>

                <DashboardSection title="Escenas" href={`/projects/${project.id}/scenes`} createHref={`/projects/${project.id}/scenes/create`}>
                    {(project.scenes ?? []).map((scene) => (
                        <SceneCard key={scene.id} scene={scene} />
                    ))}
                </DashboardSection>

                <DashboardSection title="Dialogos" href={`/projects/${project.id}/dialogues`} createHref={`/projects/${project.id}/dialogues/create`}>
                    {(project.dialogue_nodes ?? []).map((dialogue) => (
                        <DialogueNodeCard key={dialogue.id} dialogue={dialogue} />
                    ))}
                </DashboardSection>
            </div>
        </AppShell>
    );
}

function QuickLinks({ projectId }: { projectId: number }) {
    const links = [
        ['Crear lore', `/projects/${projectId}/lore/create`],
        ['Crear personaje', `/projects/${projectId}/characters/create`],
        ['Crear escena', `/projects/${projectId}/scenes/create`],
        ['Crear dialogo', `/projects/${projectId}/dialogues/create`],
    ];

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {links.map(([label, href]) => (
                <Link key={href} href={href} className="border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 hover:border-amber-500">
                    {label}
                </Link>
            ))}
        </div>
    );
}

function DashboardSection({ title, href, createHref, children }: { title: string; href: string; createHref: string; children: ReactNode }) {
    return (
        <section>
            <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <div className="flex gap-2">
                    <Link href={href} className="border border-zinc-700 px-3 py-2 text-sm hover:border-amber-500">
                        Ver todo
                    </Link>
                    <Link href={createHref} className="border border-amber-600 px-3 py-2 text-sm text-amber-100 hover:bg-amber-950">
                        Crear
                    </Link>
                </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">{children}</div>
        </section>
    );
}
