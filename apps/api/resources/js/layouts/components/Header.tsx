import { Link, router, usePage } from '@inertiajs/react';
import { ArrowUpRight, Menu } from 'lucide-react';
import { useState } from 'react';
import type { PageProps } from '../../features/projects/projects.types';
import Brand from './Brand';

export default function Header() {
    const { url, props } = usePage<PageProps>();
    const [open, setOpen] = useState(false);
    const user = props.auth?.user;
    const active = (path: string) => (url === path || (path !== '/' && url.startsWith(path)) ? 'text-white' : 'hover:text-white');

    return (
        <header className="relative z-20 border-b border-border">
            <div className="mx-auto flex h-[88px] max-w-[1400px] items-center justify-between px-6 lg:px-16">
                <Brand />
                <nav className="hidden items-center gap-9 text-[13px] text-[#afb5ac] md:flex">
                    <Link className={active('/')} href="/">
                        Inicio
                    </Link>
                    <a href="/#herramientas" className="hover:text-white">
                        El universo GAMERDUST
                    </a>
                    <Link className={active('/projects')} href="/projects">
                        Mis proyectos
                    </Link>
                </nav>
                <div className="hidden items-center gap-6 text-[13px] sm:flex">
                    {user ? (
                        <>
                            <Link href="/account" className="text-[#afb5ac] hover:text-white">
                                {user.name}
                            </Link>
                            <button type="button" onClick={() => router.post('/logout')} className="text-[#afb5ac] hover:text-white">
                                Salir
                            </button>
                        </>
                    ) : (
                        <Link href="/login" className="flex items-center gap-6">
                            Comenzar a escribir <ArrowUpRight size={17} className="text-primary" />
                        </Link>
                    )}
                </div>
                <button aria-label="Abrir navegación" className="md:hidden" onClick={() => setOpen(!open)}>
                    <Menu />
                </button>
            </div>
            {open && (
                <nav className="absolute flex w-full flex-col gap-5 border-b border-border bg-background p-6">
                    <Link href="/">Inicio</Link>
                    <Link href="/projects">Mis proyectos</Link>
                    <a href="/#herramientas">El universo GAMERDUST</a>
                </nav>
            )}
        </header>
    );
}
