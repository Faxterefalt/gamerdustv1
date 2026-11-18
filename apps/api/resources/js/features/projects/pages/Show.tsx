import { __ } from '../../../shared/lib/i18n';
import { Head, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import CharacterCard from '../../characters/components/CharacterCard';
import ConstraintForm from '../components/ConstraintForm';
import DialogueNodeCard from '../../dialogues/components/DialogueNodeCard';
import EmotionalAnalysisPanel from '../../analysis/components/EmotionalAnalysisPanel';
import LoreEntryCard from '../../lore/components/LoreEntryCard';
import NarrativeValidationPanel from '../../analysis/components/NarrativeValidationPanel';
import ProjectStats from '../components/ProjectStats';
import SceneCard from '../../scenes/components/SceneCard';
import type { ConstraintUsage, Project } from '../projects.types';
import type { NarrativeValidation } from '../../analysis/validation.types';
import { genreLabel, languageLabel, narrativeLabel, statusLabel } from '../projectOptions';

interface ProjectShowProps {
    project: Project;
    validations: NarrativeValidation[];
    closedValidations: NarrativeValidation[];
    constraintUsage: ConstraintUsage;
}

export default function Show({ project, validations, closedValidations, constraintUsage }: ProjectShowProps) {
    const latestAnalysis = project.emotional_analyses?.[0] ?? null;

    return (
        <ProjectLayout
            title={project.title}
            actions={
                <div className="flex flex-wrap gap-2">
                    <Link href={`/projects/${project.id}/branching`} className="border border-amber-600 px-4 py-2 text-sm text-amber-100 hover:bg-amber-950">
                        {__('Branching editor')}
                    </Link>
                    <Link href={`/projects/${project.id}/edit`} className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                        {__('Edit')}
                    </Link>
                    <Link href="/projects" className="border border-zinc-700 px-4 py-2 text-sm hover:border-amber-500">
                        {__('Projects')}
                    </Link>
                </div>
            }
        >
            <Head title={project.title} />

            <div className="space-y-6">
                <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                    <div className="border border-zinc-800 bg-zinc-900 p-5">
                        <div className="flex flex-wrap gap-2 text-xs text-zinc-300">
                            <span className="border border-zinc-700 px-2 py-1">{statusLabel(project.status)}</span>
                            <span className="border border-zinc-700 px-2 py-1">{narrativeLabel(project.narrative_type)}</span>
                            {project.game_genre && <span className="border border-zinc-700 px-2 py-1">{genreLabel(project.game_genre)}</span>}
                            {project.language && <span className="border border-zinc-700 px-2 py-1">{languageLabel(project.language)}</span>}
                        </div>
                        {project.description && <p className="mt-4 text-zinc-300">{project.description}</p>}
                        {project.premise && (
                            <div className="mt-5">
                                <h2 className="text-sm font-semibold text-amber-200">{__('Premise')}</h2>
                                <p className="mt-2 text-sm text-zinc-300">{project.premise}</p>
                            </div>
                        )}
                        {project.central_conflict && (
                            <div className="mt-5">
                                <h2 className="text-sm font-semibold text-rose-200">{__('Main conflict')}</h2>
                                <p className="mt-2 text-sm text-zinc-300">{project.central_conflict}</p>
                            </div>
                        )}
                    </div>
                    <ProjectStats project={project} />
                </section>

                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <ConstraintForm project={project} usage={constraintUsage} />
                    <NarrativeValidationPanel projectId={project.id} validations={validations} closed={closedValidations} />
                </div>

                <EmotionalAnalysisPanel projectId={project.id} analysis={latestAnalysis} scenes={project.scenes ?? []} dialogues={project.dialogue_nodes ?? []} />

                <QuickLinks projectId={project.id} />

                <DashboardSection title={__('Recent lore')} href={`/projects/${project.id}/lore`} createHref={`/projects/${project.id}/lore/create`}>
                    {(project.lore_entries ?? []).map((entry) => (
                        <LoreEntryCard key={entry.id} entry={entry} />
                    ))}
                </DashboardSection>

                <DashboardSection title={__('Characters')} href={`/projects/${project.id}/characters`} createHref={`/projects/${project.id}/characters/create`}>
                    {(project.characters ?? []).map((character) => (
                        <CharacterCard key={character.id} character={character} />
                    ))}
                </DashboardSection>

                <DashboardSection title={__('Scenes')} href={`/projects/${project.id}/scenes`} createHref={`/projects/${project.id}/scenes/create`}>
                    {(project.scenes ?? []).map((scene) => (
                        <SceneCard key={scene.id} scene={scene} />
                    ))}
                </DashboardSection>

                <DashboardSection title={__('Dialogues')} href={`/projects/${project.id}/dialogues`} createHref={`/projects/${project.id}/dialogues/create`}>
                    {(project.dialogue_nodes ?? []).map((dialogue) => (
                        <DialogueNodeCard key={dialogue.id} dialogue={dialogue} />
                    ))}
                </DashboardSection>
            </div>
        </ProjectLayout>
    );
}

function QuickLinks({ projectId }: { projectId: number }) {
    const links = [
        [__('Script editor'), `/projects/${projectId}/script`],
        [__('Create lore'), `/projects/${projectId}/lore/create`],
        [__('Create character'), `/projects/${projectId}/characters/create`],
        [__('Create scene'), `/projects/${projectId}/scenes/create`],
        [__('Create dialogue'), `/projects/${projectId}/dialogues/create`],
        [__('Branching map'), `/projects/${projectId}/branching`],
    ];

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
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
                        {__('View all')}
                    </Link>
                    <Link href={createHref} className="border border-amber-600 px-3 py-2 text-sm text-amber-100 hover:bg-amber-950">
                        {__('Create')}
                    </Link>
                </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">{children}</div>
        </section>
    );
}
