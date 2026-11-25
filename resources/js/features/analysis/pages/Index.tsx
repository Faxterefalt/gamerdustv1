import { Head, Link } from '@inertiajs/react';
import { ArrowUpRight, ChartNoAxesCombined, FileText, HeartPulse, Info, MessageSquare, Users } from 'lucide-react';
import { useState } from 'react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import { PageHeading } from '../../../shared/components/ui';
import { __, choice } from '../../../shared/lib/i18n';
import { card, field, secondary } from '../../../shared/lib/styles';
import type { Project } from '../../projects/projects.types';
import { countWords, sceneCodes, sceneText, type ScriptScene } from '../../script/script.types';
import AnalysisTabs from '../components/AnalysisTabs';
import NarrativeValidationPanel from '../components/NarrativeValidationPanel';
import type { NarrativeValidation } from '../validation.types';

interface AnalysisProps {
    project: Project;
    scenes: ScriptScene[];
    validations: NarrativeValidation[];
    closedValidations: NarrativeValidation[];
    initialSceneId: number | null;
}

export default function Index({ project, scenes, validations, closedValidations, initialSceneId }: AnalysisProps) {
    const [selected, setSelected] = useState<number | 'all'>(scenes.some((scene) => scene.id === initialSceneId) ? (initialSceneId as number) : 'all');
    const codes = sceneCodes(scenes);
    const current = selected === 'all' ? scenes : scenes.filter((scene) => scene.id === selected);
    const totalWords = current.reduce((sum, scene) => sum + countWords(sceneText(scene)), 0);
    const dialogueWords = current
        .flatMap((scene) => scene.script)
        .filter((block) => block.kind === 'dialogue')
        .reduce((sum, block) => sum + countWords(block.text), 0);
    const people = new Set(current.flatMap((scene) => scene.character_ids)).size;

    const metrics = [
        { label: __('Words'), value: totalWords, icon: FileText },
        { label: __('Scenes'), value: current.length, icon: ChartNoAxesCombined },
        { label: __('Dialogue words'), value: dialogueWords, icon: MessageSquare },
        { label: __('Linked characters'), value: people, icon: Users },
    ];

    return (
        <ProjectLayout>
            <Head title={`${__('AI Analysis')} - ${project.title}`} />
            <PageHeading title={__('AI Analysis')} description={__('A look at the structure of your story, based on the data you have written.')} />
            <AnalysisTabs projectId={project.id} active="metrics" />

            <div className="mb-8 flex flex-wrap items-start justify-between gap-4 rounded-lg border border-info/40 bg-info/10 p-5">
                <div className="flex items-start gap-3">
                    <Info size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-info" />
                    <div>
                        <p className="font-bold">{__('Text metrics. This tab does not call the AI.')}</p>
                        <p className="mt-1 max-w-[70ch] text-sm text-muted">
                            {__('These figures count words, dialogue and links. The emotional analysis with AI runs only when you press Analyze emotions in the Script; its results appear in Emotional evolution.')}
                        </p>
                    </div>
                </div>
                <Link href={`/projects/${project.id}/analysis/evolution`} className={secondary}>
                    <HeartPulse size={16} aria-hidden="true" /> {__('See emotional evolution')}
                </Link>
            </div>

            <label className="mb-8 block max-w-sm text-sm font-bold">
                {__('Analysis scope')}
                <select value={selected} onChange={(event) => setSelected(event.target.value === 'all' ? 'all' : Number(event.target.value))} className={field}>
                    <option value="all">{__('Whole project')}</option>
                    {scenes.map((scene) => (
                        <option value={scene.id} key={scene.id}>
                            {codes.get(scene.id)} {scene.title}
                        </option>
                    ))}
                </select>
            </label>

            {/* Las cifras como un HUD: pixel y reglas finas, sin tarjetas iguales con icono. */}
            <dl className="grid grid-cols-2 border-y border-border xl:grid-cols-4">
                {metrics.map(({ label, value }, index) => (
                    <div key={label} className={`flex flex-col-reverse gap-1 py-4 ${index % 2 ? 'border-l border-border pl-4' : ''} ${index >= 2 ? 'border-t border-border xl:border-t-0' : ''} ${index === 2 ? 'xl:border-l xl:pl-4' : ''}`}>
                        <dt className="text-sm text-muted">{label}</dt>
                        <dd className="font-pixel text-hud text-foreground">{value}</dd>
                    </div>
                ))}
            </dl>

            <section className={`${card} mt-6 overflow-hidden`}>
                <h2 className="border-b border-border px-6 py-4 text-lg font-bold">{__('The pulse of your scenes')}</h2>
                <div className="divide-y divide-border">
                    {current.map((scene) => (
                        <Link
                            key={scene.id}
                            href={`/projects/${project.id}/script?scene=${scene.id}`}
                            className="flex min-h-14 flex-wrap items-center justify-between gap-4 px-6 py-3 transition-colors hover:bg-surface-2"
                        >
                            <span className="flex items-center gap-3">
                                <span className="font-pixel text-primary">{codes.get(scene.id)}</span>
                                <span>{scene.title}</span>
                            </span>
                            <span className="flex items-center gap-6 text-sm text-muted">
                                {choice(':count word|:count words', countWords(sceneText(scene)))}
                                <ArrowUpRight size={16} aria-hidden="true" className="text-primary" />
                            </span>
                        </Link>
                    ))}
                </div>
                {!current.length && <p className="p-8 text-xs leading-6 text-muted">{__('Add a scene and write its first blocks to see its metrics.')}</p>}
            </section>

            <p className="mb-8 mt-5 text-xs leading-6 text-muted">
                {__('Dialogue makes up :percent% of the words in the selected scope.', {
                    percent: totalWords ? Math.round((dialogueWords / totalWords) * 100) : 0,
                })}
            </p>

            <NarrativeValidationPanel projectId={project.id} validations={validations} closed={closedValidations} />
        </ProjectLayout>
    );
}
