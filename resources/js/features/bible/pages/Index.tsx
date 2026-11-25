import { Head, Link } from '@inertiajs/react';
import { ArrowUpRight, MapPin, Plus, Scale, ScrollText, UserRound } from 'lucide-react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import { PageHeading } from '../../../shared/components/ui';
import { __ } from '../../../shared/lib/i18n';
import { card, secondary } from '../../../shared/lib/styles';
import ConstraintForm from '../../projects/components/ConstraintForm';
import BibleTabs from '../components/BibleTabs';
import type { ConstraintUsage, Project } from '../../projects/projects.types';

interface Reference {
    id: number;
    name: string;
    description: string | null;
    href: string;
}

interface BibleProps {
    project: Project;
    characters: { id: number; name: string; role: string | null; motivation: string | null; background: string | null }[];
    locations: { id: number; title: string; description: string | null }[];
    rules: { id: number; title: string; statement: string | null; description: string | null }[];
    loreCount: number;
    constraintUsage: ConstraintUsage;
}

export default function Index({ project, characters, locations, rules, loreCount, constraintUsage }: BibleProps) {
    const base = `/projects/${project.id}`;
    const groups = [
        {
            key: 'characters',
            label: __('Characters'),
            icon: UserRound,
            empty: __('You have not added characters to this world yet.'),
            // Sin botón de alta: la pestaña Personajes ya abre la ficha.
            add: null,
            addHref: `${base}/characters`,
            allHref: `${base}/characters`,
            records: characters.map<Reference>((character) => ({
                id: character.id,
                name: character.name,
                description: character.role || character.motivation || character.background,
                href: `${base}/characters?character=${character.id}`,
            })),
        },
        {
            key: 'locations',
            label: __('Places'),
            icon: MapPin,
            empty: __('You have not added locations to this world yet.'),
            add: __('New place'),
            addHref: `${base}/bible/locations`,
            allHref: `${base}/bible/locations`,
            records: locations.map<Reference>((location) => ({ id: location.id, name: location.title, description: location.description, href: `${base}/bible/locations?entry=${location.id}` })),
        },
        {
            key: 'rules',
            label: __('World rules'),
            icon: Scale,
            empty: __('You have not defined the rules of this world yet.'),
            add: __('New rule'),
            addHref: `${base}/bible/rules`,
            allHref: `${base}/bible/rules`,
            records: rules.map<Reference>((rule) => ({ id: rule.id, name: rule.title, description: rule.statement || rule.description, href: `${base}/bible/rules?entry=${rule.id}` })),
        },
    ];

    return (
        <ProjectLayout>
            <Head title={`${__('Narrative Bible')} - ${project.title}`} />
            <PageHeading title={__('Narrative Bible')} description={__('The memory of your universe. Define its essence and meet those who inhabit it.')} />
            <BibleTabs projectId={project.id} active="essence" />

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div id="brief">
                    <ConstraintForm project={project} usage={constraintUsage} />
                </div>

                <div className="space-y-5">
                    {groups.map(({ key, label, icon: Icon, empty, add, addHref, allHref, records }) => (
                        <section key={key} className={`${card} p-5`}>
                            <h2 className="flex items-center gap-2 font-display text-base">
                                <Icon size={17} className="text-primary" />
                                {label}
                                <span className="ml-auto font-mono text-[10px] text-[#9faf93]">{String(records.length).padStart(2, '0')}</span>
                            </h2>
                            <div className="mt-4 space-y-3">
                                {records.map((record) => (
                                    <Link key={record.id} href={record.href} className="block rounded-lg border border-border bg-background/40 p-3.5 transition hover:border-primary/40">
                                        <p className="text-sm text-[#dbe4d3]">{record.name}</p>
                                        <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-[11px] leading-6 text-[#a0b294]">{record.description || __('No description yet.')}</p>
                                    </Link>
                                ))}
                            </div>
                            {!records.length && <p className="my-5 text-xs leading-6 text-[#a0b294]">{empty}</p>}
                            <div className="mt-4 flex gap-2">
                                {add && (
                                    <Link href={addHref} className={`${secondary} flex-1 border-dashed`}>
                                        <Plus size={14} /> {add}
                                    </Link>
                                )}
                                {(records.length > 0 || !add) && (
                                    <Link href={allHref} className={`${secondary} ${add ? '' : 'flex-1'}`} aria-label={add ? __('View all') : undefined}>
                                        <ArrowUpRight size={14} /> {!add && __('Open sheets')}
                                    </Link>
                                )}
                            </div>
                        </section>
                    ))}

                    <Link href={`${base}/lore`} className={`${card} flex items-center gap-3 p-5 transition hover:border-primary/40`}>
                        <ScrollText size={18} className="text-primary" />
                        <span className="text-sm">{__('Lore')}</span>
                        <span className="ml-auto font-mono text-[10px] text-[#9faf93]">{String(loreCount).padStart(2, '0')}</span>
                        <ArrowUpRight size={14} className="text-primary" />
                    </Link>
                </div>
            </div>
        </ProjectLayout>
    );
}
