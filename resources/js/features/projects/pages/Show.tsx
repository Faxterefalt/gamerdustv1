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
import { primarySm, secondary } from '../../../shared/lib/styles';

interface ProjectShowProps {
    project: Project;
    validations: NarrativeValidation[];
    closedValidations: NarrativeValidation[];
    constraintUsage: ConstraintUsage;
}

/*
 * Panel del proyecto: arriba el resumen y el HUD con los recuentos; después el planteamiento (con los límites
 * de producción) junto a las validaciones; al final, lo reciente de cada sección.
 */
export default function Show({ project, validations, closedValidations, constraintUsage }: ProjectShowProps) {
    const latestAnalysis = project.emotional_analyses?.[0] ?? null;
    const tags = [statusLabel(project.status), narrativeLabel(project.narrative_type), project.game_genre && genreLabel(project.game_genre), project.language && languageLabel(project.language)].filter(
        Boolean,
    ) as string[];

    return (
        <ProjectLayout
            title={project.title}
            actions={
                <div className="flex flex-wrap gap-2">
                    <Link href={`/projects/${project.id}/branching`} className={primarySm}>
                        {__('Branching editor')}
                    </Link>
                    <Link href={`/projects/${project.id}/edit`} className={secondary}>
                        {__('Edit')}
                    </Link>
                    <Link href="/projects" className={secondary}>
                        {__('Projects')}
                    </Link>
                </div>
            }
        >
            <Head title={project.title} />

            <div className="space-y-10">
                <section aria-label={__('Summary')} className="space-y-6">
                    <ul className="flex flex-wrap gap-2" aria-label={__('Project details')}>
                        {tags.map((tag) => (
                            <li key={tag} className="rounded-sm border border-border-strong px-2 py-0.5 text-sm text-muted">
                                {tag}
                            </li>
                        ))}
                    </ul>
                    {project.description && <p className="max-w-[70ch] text-lg">{project.description}</p>}
                    <ProjectStats project={project} />
                    {(project.premise || project.central_conflict) && (
                        <div className="grid gap-6 md:grid-cols-2">
                            {project.premise && (
                                <div>
                                    <h2 className="font-bold">{__('Premise')}</h2>
                                    <p className="mt-2 max-w-[65ch] text-muted">{project.premise}</p>
                                </div>
                            )}
                            {project.central_conflict && (
                                <div>
                                    <h2 className="font-bold">{__('Main conflict')}</h2>
                                    <p className="mt-2 max-w-[65ch] text-muted">{project.central_conflict}</p>
                                </div>
                            )}
                        </div>
                    )}
                    <QuickLinks projectId={project.id} />
                </section>

                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <ConstraintForm project={project} usage={constraintUsage} />
                    <div className="space-y-6">
                        <NarrativeValidationPanel projectId={project.id} validations={validations} closed={closedValidations} />
                        <EmotionalAnalysisPanel projectId={project.id} analysis={latestAnalysis} scenes={project.scenes ?? []} dialogues={project.dialogue_nodes ?? []} />
                    </div>
                </div>

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
        <nav aria-label={__('Quick access')} className="flex flex-wrap gap-2">
            {links.map(([label, href]) => (
                <Link key={href} href={href} className={secondary}>
                    {label}
                </Link>
            ))}
        </nav>
    );
}

function DashboardSection({ title, href, createHref, children }: { title: string; href: string; createHref: string; children: ReactNode }) {
    return (
        <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
                <h2 className="text-xl font-bold">{title}</h2>
                <div className="flex gap-2">
                    <Link href={href} className={secondary}>
                        {__('View all')}
                    </Link>
                    <Link href={createHref} className={primarySm}>
                        {__('Create')}
                    </Link>
                </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">{children}</div>
        </section>
    );
}
