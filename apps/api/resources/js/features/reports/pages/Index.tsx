import { Head } from '@inertiajs/react';
import { Download, FileDown, FileText, Network } from 'lucide-react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import { PageHeading } from '../../../shared/components/ui';
import { __, choice } from '../../../shared/lib/i18n';
import { card, primarySm } from '../../../shared/lib/styles';
import { genreLabel, languageLabel } from '../../projects/projectOptions';
import type { Project } from '../../projects/projects.types';

interface ReportsProps {
    project: Project;
    counts: { scenes: number; characters: number; locations: number; mechanics: number; dialogues: number };
}

export default function Index({ project, counts }: ReportsProps) {
    const base = `/projects/${project.id}`;
    const stats = [
        choice(':count scene|:count scenes', counts.scenes),
        choice(':count character|:count characters', counts.characters),
        choice(':count location|:count locations', counts.locations),
        choice(':count mechanic|:count mechanics', counts.mechanics),
    ];

    return (
        <ProjectLayout>
            <Head title={`${__('Reports')} - ${project.title}`} />
            <PageHeading title={__('Reports')} description={__('Your universe does not end in the editor. Take what you have built with you.')} />

            <section className={`${card} mb-6 p-6 sm:p-8`}>
                <p className="font-mono text-[9px] tracking-wider text-primary">{__('WORLD DOCUMENT')}</p>
                <h2 className="mt-4 break-words font-display text-2xl">{project.title}</h2>
                <p className="mt-3 text-xs text-[#a7ba9c]">
                    {project.game_genre ? genreLabel(project.game_genre) : __('No genre')} / {languageLabel(project.language ?? 'es')}
                </p>
                <div className="mt-7 flex flex-wrap gap-7 border-t border-border pt-5">
                    {stats.map((label) => {
                        const [value, ...words] = label.split(' ');

                        return (
                            <p key={label} className="text-xs text-[#adbea2]">
                                <span className="mr-2 font-display text-xl text-foreground">{value}</span>
                                {words.join(' ')}
                            </p>
                        );
                    })}
                </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                <article className={`${card} flex flex-col items-start p-6 sm:p-8`}>
                    <FileText size={27} className="text-primary" strokeWidth={1.4} />
                    <h2 className="mt-6 font-display text-xl">{__('Bible and script in Markdown')}</h2>
                    <p className="mb-7 mt-3 flex-1 text-xs leading-7 text-[#adbea1]">
                        {__('The premise, characters, locations, mechanics and every scene in an editable text file.')}
                    </p>
                    <a href={`${base}/reports/markdown`} className={primarySm}>
                        <Download size={14} /> {__('Download .md')}
                    </a>
                </article>
                <article className={`${card} flex flex-col items-start p-6 sm:p-8`}>
                    <FileDown size={27} className="text-primary" strokeWidth={1.4} />
                    <h2 className="mt-6 font-display text-xl">{__('Script as PDF')}</h2>
                    <p className="mb-7 mt-3 flex-1 text-xs leading-7 text-[#adbea1]">
                        {__('All your scenes in screenplay format: headings, actions, characters, dialogue and parentheticals. Opens the print view, where you can save it as PDF.')}
                    </p>
                    <a href={`${base}/script/print`} target="_blank" rel="noopener" className={primarySm}>
                        <Download size={14} /> {__('Export PDF')}
                    </a>
                </article>
                <article className={`${card} flex flex-col items-start p-6 sm:p-8 lg:col-span-2 xl:col-span-1`}>
                    <Network size={27} className="text-primary" strokeWidth={1.4} />
                    <h2 className="mt-6 font-display text-xl">{__('Interactive dialogue map')}</h2>
                    <p className="mb-7 mt-3 flex-1 text-xs leading-7 text-[#adbea1]">
                        {__('Every dialogue node and its choices in a standalone HTML file, like Twine: explore the decision map or play through the branches in any browser, without internet.')}
                        <span className="mt-2 block text-[#9eb392]">
                            {choice(':count node|:count nodes', counts.dialogues)}
                        </span>
                    </p>
                    <a href={`${base}/reports/dialogues`} className={primarySm}>
                        <Download size={14} /> {__('Download .html')}
                    </a>
                </article>
            </div>

            <p className="mt-6 text-[11px] leading-6 text-[#9eb392]">{__('Files include the data saved on the server. Save your Script changes before exporting from Reports.')}</p>
        </ProjectLayout>
    );
}
