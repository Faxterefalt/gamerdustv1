import { __ } from '../../../shared/lib/i18n';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, ArrowUpRight, Check, GitBranch, Globe2, Sparkles, Users } from 'lucide-react';
import SiteLayout from '../../../layouts/SiteLayout';
import { button } from '../../../shared/lib/styles';

const forest = 'https://images.unsplash.com/photo-1483982258113-b72862e6cff6?auto=format&fit=crop&w=1600&q=85';

const pixel = "font-['Pixelify_Sans',monospace] font-bold text-primary tracking-normal";

const tools = [
    { icon: Globe2, title: 'Worlds that breathe', text: 'Build the history, rules and secrets of a universe that feels alive.', tag: 'WORLDBUILDING' },
    { icon: Users, title: 'More than an NPC', text: 'Give them a past, desires and contradictions. Create characters your players will remember.', tag: 'CHARACTERS' },
    { icon: GitBranch, title: 'Every choice, a path', text: 'Connect scenes, explore branches and turn decisions into stories.', tag: 'NON-LINEAR NARRATIVE' },
];

export default function Landing() {
    return (
        <SiteLayout>
            <Head title={__('Home')} />
            <section className="mx-auto grid max-w-[1400px] gap-12 px-6 pb-16 pt-14 lg:grid-cols-[1.04fr_1fr] lg:gap-14 lg:px-16 lg:pb-20 lg:pt-16">
                <div className="flex flex-col items-start py-3">
                    <span className="flex items-center gap-2 font-mono text-[10px] tracking-[.14em] text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {__('YOUR NEXT UNIVERSE STARTS HERE')}
                    </span>
                    <h1 className="mt-7 font-['Outfit',sans-serif] text-[clamp(48px,5.1vw,74px)] font-medium leading-[1.06] tracking-[-.035em]">
                        {__('There are stories')}
                        <br />
                        {__('that deserve')}
                        <br />
                        {__('to be')} <span className={pixel}>{__('played.')}</span>
                    </h1>
                    <p className="mt-7 max-w-[390px] text-[15px] leading-[1.8] text-[#a8b0a4]">
                        {__('Create worlds, bring your characters to life and design narratives that leave a mark. Your imagination in command. AI as your adventure companion.')}
                    </p>
                    <div className="mt-8 flex flex-wrap items-center gap-7">
                        <Link href="/projects" className={button}>
                            {__('Build your world')} <ArrowUpRight size={17} />
                        </Link>
                        <a href="#herramientas" className="flex items-center gap-2 text-xs text-[#d3d8cf]">
                            {__('Explore GAMERDUST')} <ArrowRight size={15} />
                        </a>
                    </div>
                    <div className="mt-8 flex items-center gap-2 text-[11px] text-[#828d7c]">
                        <Check size={13} /> {__('Free to start')} <span className="mx-2">·</span> {__('No card. No limits to your imagination.')}
                    </div>
                </div>
                <div className="relative min-h-[530px] overflow-hidden rounded-lg border border-[#4a5741] lg:min-h-[580px]">
                    <img src={forest} alt={__('A misty forest, the setting of a world to discover')} className="absolute h-full w-full object-cover brightness-[.65]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b160f] via-transparent to-[#152918]/20" />
                    <div className="absolute bottom-6 left-6 right-6">
                        <span className="font-mono text-[9px] tracking-[.16em] text-primary">{__('DARK FANTASY / CHAPTER 01')}</span>
                        <h2 className="mt-2 font-display text-[32px]">{__('Echoes of the forest')}</h2>
                        <p className="mt-1 text-xs text-[#bdc9b7]">{__('Every decision leaves a root.')}</p>
                    </div>
                </div>
            </section>

            <section id="herramientas" className="mx-auto max-w-[1400px] px-6 py-20 lg:px-16">
                <span className="font-mono text-[10px] tracking-[.14em] text-primary">{__('YOUR CREATIVE INVENTORY')}</span>
                <h2 className="mt-4 font-['Outfit',sans-serif] text-3xl font-medium md:text-[39px]">
                    {__('Less friction.')} <span className={pixel}>{__('More imagination.')}</span>
                </h2>
                <div className="mt-9 grid gap-4 md:grid-cols-3">
                    {tools.map(({ icon: Icon, title, text, tag }) => (
                        <Link
                            href="/projects"
                            key={title}
                            className="group rounded-lg border border-border bg-[#171c16] p-6 transition hover:border-primary/40 hover:bg-[#1c2419]"
                        >
                            <div className="flex justify-between">
                                <Icon size={25} strokeWidth={1.3} className="text-primary" />
                                <ArrowUpRight size={17} className="text-[#65715c] group-hover:text-primary" />
                            </div>
                            <h3 className="mt-7 font-display text-lg">{__(title)}</h3>
                            <p className="mt-3 max-w-[300px] text-xs leading-6 text-[#9ba591]">{__(text)}</p>
                            <div className="mt-7 font-mono text-[8px] tracking-[.15em] text-[#74826b]">{__(tag)}</div>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="mx-6 mb-16 rounded-lg border border-border bg-[#1b2417] px-6 py-12 text-center lg:mx-auto lg:max-w-[1272px]">
                <Sparkles className="mx-auto text-primary" size={22} />
                <h2 className="mt-4 font-display text-3xl">{__('Your next story does not exist yet.')}</h2>
                <p className="mt-3 text-sm text-[#aab6a1]">{__('And no one can tell it like you.')}</p>
                <Link href="/projects/create" className={`${button} mt-6`}>
                    {__('Start writing it')} <ArrowUpRight size={16} />
                </Link>
            </section>
        </SiteLayout>
    );
}
