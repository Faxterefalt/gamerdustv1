import { __, locale } from '../../../shared/lib/i18n';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, BookOpen, ChevronRight, Sparkles } from 'lucide-react';
import type { FormEvent } from 'react';
import SiteLayout from '../../../layouts/SiteLayout';
import { button } from '../../../shared/lib/styles';
import GeneralFields, { validateGeneral } from '../components/GeneralFields';
import type { NarrativeType } from '../projects.types';

export default function Create() {
    const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
        title: '',
        game_genre: '',
        language: locale as string,
        narrative_type: 'balanced' as NarrativeType,
        premise: '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        clearErrors();
        const problems = validateGeneral(data);
        const keys = Object.keys(problems) as (keyof typeof problems)[];
        if (keys.length > 0) {
            keys.forEach((key) => setError(key as 'title', problems[key] as string));
            return;
        }
        post('/projects');
    };

    return (
        <SiteLayout>
            <Head title={__('Create project')} />
            <div className="mx-auto min-h-[78vh] max-w-[1400px] px-6 py-10 lg:px-16">
                <nav aria-label={__('Breadcrumb')} className="flex items-center gap-2 text-xs text-[#89967f]">
                    <Link href="/projects" className="hover:text-primary">
                        {__('My projects')}
                    </Link>
                    <ChevronRight size={13} />
                    <span className="text-[#c1c8bc]">{__('Create project')}</span>
                </nav>

                <section className="mx-auto mt-8 max-w-[820px] pb-12">
                    <span className="flex items-center gap-2 font-mono text-[10px] tracking-[.14em] text-primary">
                        <Sparkles size={14} /> {__('THE FIRST CHAPTER OF YOUR UNIVERSE')}
                    </span>
                    <h1 className="mt-4 font-display text-3xl font-medium sm:text-4xl">{__('Create narrative project')}</h1>
                    <p className="mt-3 text-sm leading-6 text-[#98a58e]">
                        {__('Give your idea a name. This is the beginning of a world only you can imagine.')}
                    </p>

                    <form onSubmit={submit} className="mt-6 rounded-xl border border-border bg-[#171d16] p-5 sm:p-6">
                        <GeneralFields data={data} setData={setData} errors={errors} idPrefix="create" />

                        <div className="mt-7 flex flex-wrap items-center justify-between gap-5 border-t border-border pt-6">
                            <p className="text-xs text-[#98a58e]">
                                <span className="text-primary">*</span> {__('Required fields')}
                            </p>
                            <div className="flex gap-3">
                                <Link href="/projects" className="inline-flex items-center justify-center rounded-md border border-border px-5 py-3 text-sm transition hover:border-primary/50">
                                    {__('Cancel')}
                                </Link>
                                <button type="submit" disabled={processing} className={`${button} disabled:opacity-50`}>
                                    {__('Create project')} <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    </form>
                    <p className="mt-5 flex items-center justify-center gap-2 text-[11px] text-[#74816b]">
                        <BookOpen size={13} /> {__('Your story belongs to you. Stored on your server.')}
                    </p>
                </section>
            </div>
        </SiteLayout>
    );
}
