import { Head, Link } from '@inertiajs/react';
import { ArrowUpRight, ChartNoAxesCombined, FileText, HeartPulse, MessageSquare, Sparkles, Users } from 'lucide-react';
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
    initialSceneId: number | null;
}

export default function Index({ project, scenes, validations, initialSceneId }: AnalysisProps) {
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

            <div className="mb-7 flex flex-wrap items-start justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 p-5">
                <div className="flex items-start gap-3">
                    <Sparkles size={19} className="mt-0.5 shrink-0 text-primary" />
                    <div>
                        <p className="font-mono text-[9px] tracking-wider text-primary">{__('METRICS OF YOUR TEXT · NO AI CALLS ON THIS TAB')}</p>
                        <p className="mt-2 max-w-2xl text-xs leading-6 text-[#b1c2a5]">
                            {__('These figures count words, dialogue and links. The emotional analysis with AI runs only when you press Analyze emotions in the Script; its results appear in Emotional evolution.')}
                        </p>
                    </div>
                </div>
                <Link href={`/projects/${project.id}/analysis/evolution`} className={secondary}>
                    <HeartPulse size={14} /> {__('See emotional evolution')}
                </Link>
            </div>

            <label className="mb-7 block max-w-sm text-xs">
                {__('Analysis scope')}
                <select value={selected} onChange={(event) => setSelected(event.target.value === 'all' ? 'all' : Number(event.target.value))} className={field}>
                    <option value="all">{__('Whole project')}</option>
                    {scenes.map((scene) => (
                        <option value={scene.id} key={scene.id}>
                            {codes.get(scene.id)} · {scene.title}
                        </option>
                    ))}
                </select>
            </label>

            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                {metrics.map(({ label, value, icon: Icon }) => (
                    <div key={label} className={`${card} p-5`}>
                        <Icon size={19} className="text-primary" strokeWidth={1.5} />
                        <p className="mt-5 font-display text-3xl">{value}</p>
                        <h2 className="mt-2 text-[11px] text-[#a8bb9b]">{label}</h2>
                    </div>
                ))}
            </div>

            <section className={`${card} mt-6 overflow-hidden`}>
                <h2 className="border-b border-border px-6 py-5 font-display text-lg">{__('The pulse of your scenes')}</h2>
                <div className="divide-y divide-border">
                    {current.map((scene) => (
                        <Link
                            key={scene.id}
                            href={`/projects/${project.id}/script?scene=${scene.id}`}
                            className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 hover:bg-primary/[.025]"
                        >
                            <span className="flex items-center gap-3">
                                <span className="font-mono text-[10px] text-primary">{codes.get(scene.id)}</span>
                                <span className="text-sm">{scene.title}</span>
                            </span>
                            <span className="flex items-center gap-6 text-[11px] text-[#a2b596]">
                                {choice(':count word|:count words', countWords(sceneText(scene)))}
                                <ArrowUpRight size={15} className="text-primary" />
                            </span>
                        </Link>
                    ))}
                </div>
                {!current.length && <p className="p-8 text-xs leading-6 text-[#a4b898]">{__('Add a scene and write its first blocks to see its metrics.')}</p>}
            </section>

            <p className="mb-8 mt-5 text-[10px] leading-6 text-[#9caf8e]">
                {__('Dialogue makes up :percent% of the words in the selected scope.', {
                    percent: totalWords ? Math.round((dialogueWords / totalWords) * 100) : 0,
                })}
            </p>

            <NarrativeValidationPanel projectId={project.id} validations={validations} />
        </ProjectLayout>
    );
}
