import { __ } from '../../../shared/lib/i18n';
import { Head, Link, usePage } from '@inertiajs/react';
import SiteLayout from '../../../layouts/SiteLayout';
import type { PageProps } from '../../projects/projects.types';
import { button, pixelAccent } from '../../../shared/lib/styles';

/*
 * Landing: el producto se enseña con capturas reales del proyecto de demostración (public/images/landing),
 * no con fotos de stock. Una idea por pantalla: el titular con la palabra pixelada, la hoja de guion,
 * lo que hace cada parte del estudio y la acción.
 */
const tools = [
    { title: 'Script', text: 'Scenes in screenplay format, with versions you can compare.' },
    { title: 'Dialogues', text: 'A graph with variables, conditions and endings you can play.' },
    { title: 'Narrative Bible', text: 'Characters, places and world rules linked to every scene.' },
    { title: 'AI Analysis', text: 'Emotional arc and coherence warnings, only when you ask.' },
];

export default function Landing() {
    const { props } = usePage<PageProps>();
    const signedIn = Boolean(props.auth?.user);

    return (
        <SiteLayout>
            <Head title={__('Home')} />
            <section className="mx-auto grid max-w-[1360px] items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16 lg:px-16 lg:pb-24 lg:pt-16">
                <div>
                    <h1 className="max-w-[14ch] text-5xl font-bold tracking-[-0.02em]">
                        {__('There are stories that deserve to be')} <span className={pixelAccent}>{__('played.')}</span>
                    </h1>
                    <p className="mt-6 max-w-[40ch] text-lg text-muted">{__('Script, branching dialogue and world coherence, in one studio.')}</p>
                    <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                        <Link href="/projects/create" className={button}>
                            {__('Create a project')}
                        </Link>
                        <Link href={signedIn ? '/projects' : '/login'} className="inline-flex min-h-11 items-center text-base text-foreground underline decoration-border-strong underline-offset-4 hover:decoration-primary">
                            {signedIn ? __('My projects') : __('Log in')}
                        </Link>
                    </div>
                </div>
                <figure className="min-w-0">
                    <img
                        src="/images/landing/guion-cumbre-muda.webp"
                        width={1120}
                        height={840}
                        fetchPriority="high"
                        alt={__('The script editor with the first scene of Cumbre Muda, the demo project')}
                        className="aspect-[4/3] w-full rounded-xl border border-border bg-surface object-cover object-left-top"
                    />
                    <figcaption className="mt-3 text-sm text-subtle">{__('Cumbre Muda, the demo project, open in the script editor.')}</figcaption>
                </figure>
            </section>

            <section id="herramientas" className="border-t border-border bg-surface">
                <div className="mx-auto grid max-w-[1360px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-16 lg:py-28">
                    <div>
                        <h2 className="text-4xl font-bold tracking-[-0.015em]">
                            {__('Less friction.')} <span className={pixelAccent}>{__('More imagination.')}</span>
                        </h2>
                        <dl className="mt-10">
                            {tools.map(({ title, text }) => (
                                <div key={title} className="grid gap-1 border-t border-border py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
                                    <dt className="font-bold">{__(title)}</dt>
                                    <dd className="text-muted">{__(text)}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                    <figure className="min-w-0 self-center">
                        <img
                            src="/images/landing/grafo-cumbre-muda.webp"
                            width={1280}
                            height={800}
                            loading="lazy"
                            alt={__('The dialogue graph of Cumbre Muda, with its start, its branches and three endings')}
                            className="aspect-[16/10] w-full rounded-xl border border-border bg-background object-cover"
                        />
                        <figcaption className="mt-3 text-sm text-subtle">{__('The dialogue graph: every choice changes variables and opens or closes paths.')}</figcaption>
                    </figure>
                </div>
            </section>

            <section className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-6 px-4 py-20 sm:px-6 lg:px-16">
                <div>
                    <h2 className="text-3xl font-bold">{__('Your next story does not exist yet.')}</h2>
                    <p className="mt-2 text-lg text-muted">{__('And no one can tell it like you.')}</p>
                </div>
                <Link href="/projects/create" className={button}>
                    {__('Start writing it')}
                </Link>
            </section>
        </SiteLayout>
    );
}
