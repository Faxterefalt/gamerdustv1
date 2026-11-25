import { __, locale } from '../../../shared/lib/i18n';
import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import type { FormEvent } from 'react';
import SiteLayout from '../../../layouts/SiteLayout';
import { button, secondary } from '../../../shared/lib/styles';
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
            <div className="mx-auto max-w-[1360px] px-4 pb-20 pt-8 sm:px-6 lg:px-16">
                <nav aria-label={__('Breadcrumb')} className="flex items-center gap-2 text-sm text-muted">
                    <Link href="/projects" className="inline-flex min-h-11 items-center hover:text-foreground">
                        {__('My projects')}
                    </Link>
                    <ChevronRight size={14} aria-hidden="true" />
                    <span className="text-muted">{__('Create project')}</span>
                </nav>

                <section className="mx-auto mt-8 max-w-[820px] pb-12">
                    <h1 className="text-3xl font-bold">{__('Create narrative project')}</h1>
                    <p className="mt-3 max-w-[60ch] text-muted">
                        {__('Give your idea a name. This is the beginning of a world only you can imagine.')}
                    </p>

                    <form onSubmit={submit} className="mt-8 rounded-lg border border-border bg-surface p-5 sm:p-8">
                        <GeneralFields data={data} setData={setData} errors={errors} idPrefix="create" />

                        <div className="mt-7 flex flex-wrap items-center justify-between gap-5 border-t border-border pt-6">
                            <p className="text-sm text-muted">
                                <span className="text-primary">*</span> {__('Required fields')}
                            </p>
                            <div className="flex gap-3">
                                <Link href="/projects" className={secondary}>
                                    {__('Cancel')}
                                </Link>
                                <button type="submit" disabled={processing} className={`${button} disabled:opacity-50`}>
                                    {__('Create project')}
                                </button>
                            </div>
                        </div>
                    </form>
                    <p className="mt-5 text-sm text-subtle">
                        {__('Your story belongs to you. Stored on your server.')}
                    </p>
                </section>
            </div>
        </SiteLayout>
    );
}
