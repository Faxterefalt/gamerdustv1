import { Head, Link } from '@inertiajs/react';
import { ArrowRight, ArrowUpRight, Check, GitBranch, Globe2, Sparkles, Users } from 'lucide-react';
import SiteLayout from '../../../layouts/SiteLayout';
import { button } from '../../../shared/lib/styles';

const forest = 'https://images.unsplash.com/photo-1483982258113-b72862e6cff6?auto=format&fit=crop&w=1600&q=85';

const pixel = "font-['Pixelify_Sans',monospace] font-bold text-primary tracking-normal";

const tools = [
    { icon: Globe2, title: 'Mundos que respiran', text: 'Construye la historia, las reglas y los secretos de un universo que se siente vivo.', tag: 'WORLDBUILDING' },
    { icon: Users, title: 'Más que un NPC', text: 'Dales un pasado, deseos y contradicciones. Crea personajes que tus jugadores recuerden.', tag: 'PERSONAJES' },
    { icon: GitBranch, title: 'Cada elección, un camino', text: 'Conecta escenas, explora ramificaciones y convierte las decisiones en historias.', tag: 'NARRATIVA NO LINEAL' },
];

export default function Landing() {
    return (
        <SiteLayout>
            <Head title="Inicio" />
            <section className="mx-auto grid max-w-[1400px] gap-12 px-6 pb-16 pt-14 lg:grid-cols-[1.04fr_1fr] lg:gap-14 lg:px-16 lg:pb-20 lg:pt-16">
                <div className="flex flex-col items-start py-3">
                    <span className="flex items-center gap-2 font-mono text-[10px] tracking-[.14em] text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" /> TU PRÓXIMO UNIVERSO EMPIEZA AQUÍ
                    </span>
                    <h1 className="mt-7 font-['Outfit',sans-serif] text-[clamp(48px,5.1vw,74px)] font-medium leading-[1.06] tracking-[-.035em]">
                        Hay historias
                        <br />
                        que merecen
                        <br />
                        ser <span className={pixel}>jugadas.</span>
                    </h1>
                    <p className="mt-7 max-w-[390px] text-[15px] leading-[1.8] text-[#a8b0a4]">
                        Crea mundos, da vida a tus personajes y diseña narrativas que dejan huella. Tu imaginación al mando. La IA como compañera de aventura.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center gap-7">
                        <Link href="/projects" className={button}>
                            Construye tu mundo <ArrowUpRight size={17} />
                        </Link>
                        <a href="#herramientas" className="flex items-center gap-2 text-xs text-[#d3d8cf]">
                            Explora GAMERDUST <ArrowRight size={15} />
                        </a>
                    </div>
                    <div className="mt-8 flex items-center gap-2 text-[11px] text-[#828d7c]">
                        <Check size={13} /> Gratis para empezar <span className="mx-2">·</span> Sin tarjeta. Sin límites a tu imaginación.
                    </div>
                </div>
                <div className="relative min-h-[530px] overflow-hidden rounded-lg border border-[#4a5741] lg:min-h-[580px]">
                    <img src={forest} alt="Un bosque brumoso, escenario de un mundo por descubrir" className="absolute h-full w-full object-cover brightness-[.65]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b160f] via-transparent to-[#152918]/20" />
                    <div className="absolute bottom-6 left-6 right-6">
                        <span className="font-mono text-[9px] tracking-[.16em] text-primary">FANTASÍA OSCURA / CAPÍTULO 01</span>
                        <h2 className="mt-2 font-display text-[32px]">Ecos del bosque</h2>
                        <p className="mt-1 text-xs text-[#bdc9b7]">Toda decisión deja una raíz.</p>
                    </div>
                </div>
            </section>

            <section id="herramientas" className="mx-auto max-w-[1400px] px-6 py-20 lg:px-16">
                <span className="font-mono text-[10px] tracking-[.14em] text-primary">TU INVENTARIO CREATIVO</span>
                <h2 className="mt-4 font-['Outfit',sans-serif] text-3xl font-medium md:text-[39px]">
                    Menos fricción. <span className={pixel}>Más imaginación.</span>
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
                            <h3 className="mt-7 font-display text-lg">{title}</h3>
                            <p className="mt-3 max-w-[300px] text-xs leading-6 text-[#9ba591]">{text}</p>
                            <div className="mt-7 font-mono text-[8px] tracking-[.15em] text-[#74826b]">{tag}</div>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="mx-6 mb-16 rounded-lg border border-border bg-[#1b2417] px-6 py-12 text-center lg:mx-auto lg:max-w-[1272px]">
                <Sparkles className="mx-auto text-primary" size={22} />
                <h2 className="mt-4 font-display text-3xl">Tu próxima historia todavía no existe.</h2>
                <p className="mt-3 text-sm text-[#aab6a1]">Y nadie puede contarla como tú.</p>
                <Link href="/projects/create" className={`${button} mt-6`}>
                    Empieza a escribirla <ArrowUpRight size={16} />
                </Link>
            </section>
        </SiteLayout>
    );
}
