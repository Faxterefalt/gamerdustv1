import { Head } from '@inertiajs/react';
import { ClipboardList, Download, FileDown, FileText, Network } from 'lucide-react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import { PageHeading } from '../../../shared/components/ui';
import { __, choice } from '../../../shared/lib/i18n';
import { card, secondary } from '../../../shared/lib/styles';
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
                <h2 className="break-words text-2xl font-bold">{project.title}</h2>
                <p className="mt-2 text-muted">
                    {__('World document: :genre, :language', { genre: project.game_genre ? genreLabel(project.game_genre) : __('No genre'), language: languageLabel(project.language ?? 'es') })}
                </p>
                <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-5">
                    {stats.map((label) => {
                        const [value, ...words] = label.split(' ');

                        return (
                            <p key={label} className="text-muted">
                                <span className="mr-2 font-pixel text-hud text-foreground">{value}</span>
                                {words.join(' ')}
                            </p>
                        );
                    })}
                </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
                <article className={`${card} flex flex-col items-start p-6`}>
                    <h2 className="flex items-center gap-3 text-xl font-bold">
                        <FileText size={22} aria-hidden="true" className="shrink-0 text-primary" strokeWidth={1.75} />
                        {__('Bible and script in Markdown')}</h2>
                    <p className="mb-6 mt-3 max-w-[60ch] flex-1 text-muted">
                        {__('The premise, characters, locations, mechanics and every scene in an editable text file.')}
                    </p>
                    <a href={`${base}/reports/markdown`} className={secondary}>
                        <Download size={16} aria-hidden="true" /> {__('Download .md')}
                    </a>
                </article>
                <article className={`${card} flex flex-col items-start p-6`}>
                    <h2 className="flex items-center gap-3 text-xl font-bold">
                        <FileDown size={22} aria-hidden="true" className="shrink-0 text-primary" strokeWidth={1.75} />
                        {__('Script as PDF')}</h2>
                    <p className="mb-6 mt-3 max-w-[60ch] flex-1 text-muted">
                        {__('All your scenes in screenplay format: headings, actions, characters, dialogue and parentheticals. Opens the print view, where you can save it as PDF.')}
                    </p>
                    <a href={`${base}/script/print`} target="_blank" rel="noopener" className={secondary}>
                        <Download size={16} aria-hidden="true" /> {__('Export PDF')}
                    </a>
                </article>
                <article className={`${card} flex flex-col items-start p-6`}>
                    <h2 className="flex items-center gap-3 text-xl font-bold">
                        <Network size={22} aria-hidden="true" className="shrink-0 text-primary" strokeWidth={1.75} />
                        {__('Interactive dialogue map')}</h2>
                    <p className="mb-6 mt-3 max-w-[60ch] flex-1 text-muted">
                        {__('Every dialogue node and its choices in a standalone HTML file, like Twine: explore the decision map or play through the branches in any browser, without internet.')}
                        <span className="mt-2 block text-muted">
                            {choice(':count node|:count nodes', counts.dialogues)}
                        </span>
                    </p>
                    <a href={`${base}/reports/dialogues`} className={secondary}>
                        <Download size={16} aria-hidden="true" /> {__('Download .html')}
                    </a>
                </article>
                <article className={`${card} flex flex-col items-start p-6`}>
                    <h2 className="flex items-center gap-3 text-xl font-bold">
                        <ClipboardList size={22} aria-hidden="true" className="shrink-0 text-primary" strokeWidth={1.75} />
                        {__('Analysis report')}</h2>
                    <p className="mb-6 mt-3 max-w-[60ch] flex-1 text-muted">
                        {__('The emotional reading of each scene in narrative language, red and amber alerts, inconsistencies, suggestions and coherence validations, with the script version each analysis read. Opens the print view.')}
                    </p>
                    <a href={`${base}/reports/analysis`} target="_blank" rel="noopener" className={secondary}>
                        <Download size={16} aria-hidden="true" /> {__('Open report')}
                    </a>
                </article>
            </div>

            <p className="mt-6 text-sm text-muted">{__('Files include the data saved on the server. Save your Script changes before exporting from Reports.')}</p>
        </ProjectLayout>
    );
}
