import { Link, router, usePage } from '@inertiajs/react';
import { ArrowUpRight, Ellipsis, Menu } from 'lucide-react';
import { useState } from 'react';
import type { PageProps } from '../../features/projects/projects.types';
import { __ } from '../../shared/lib/i18n';
import Brand from './Brand';
import LocaleSwitcher from './LocaleSwitcher';

interface HeaderProps {
    /** En el estudio de proyecto: botón hamburguesa que abre/pliega el sidebar. */
    onToggleSidebar?: () => void;
    sidebarExpanded?: boolean;
}

export default function Header({ onToggleSidebar, sidebarExpanded }: HeaderProps) {
    const { url, props } = usePage<PageProps>();
    const [open, setOpen] = useState(false);
    const user = props.auth?.user;
    const workspace = onToggleSidebar !== undefined;
    const active = (path: string) => (url === path || (path !== '/' && url.startsWith(path)) ? 'text-white' : 'hover:text-white');

    return (
        <header className={`z-30 border-b border-border ${workspace ? 'sticky top-0 bg-background' : 'relative'}`}>
            <div className={`mx-auto flex h-[88px] items-center justify-between ${workspace ? 'px-4 sm:px-6' : 'max-w-[1400px] px-6 lg:px-16'}`}>
                <div className="flex items-center gap-4">
                    {workspace && (
                        <button
                            type="button"
                            onClick={onToggleSidebar}
                            aria-label={__('Toggle project menu')}
                            aria-expanded={sidebarExpanded}
                            aria-controls="desktop-project-sidebar mobile-project-sidebar"
                            className="flex h-10 w-10 items-center justify-center rounded-md border border-border text-[#c6d1bf] transition hover:border-primary/50 hover:text-primary"
                        >
                            <Menu size={19} />
                        </button>
                    )}
                    <Brand />
                </div>
                <nav className="hidden items-center gap-9 text-[13px] text-[#afb5ac] md:flex">
                    <Link className={active('/')} href="/">
                        {__('Home')}
                    </Link>
                    <a href="/#herramientas" className="hover:text-white">
                        {__('The GAMERDUST universe')}
                    </a>
                    <Link className={active('/projects')} href="/projects">
                        {__('My projects')}
                    </Link>
                </nav>
                <div className="hidden items-center gap-6 text-[13px] sm:flex">
                    <LocaleSwitcher />
                    {user ? (
                        <>
                            <Link href="/account" className="text-[#afb5ac] hover:text-white">
                                {user.name}
                            </Link>
                            <button type="button" onClick={() => router.post('/logout')} className="text-[#afb5ac] hover:text-white">
                                {__('Log out')}
                            </button>
                        </>
                    ) : (
                        <Link href="/login" className="flex items-center gap-6">
                            {__('Start writing')} <ArrowUpRight size={17} className="text-primary" />
                        </Link>
                    )}
                </div>
                <button type="button" aria-label={__('Open navigation')} aria-expanded={open} className="md:hidden" onClick={() => setOpen(!open)}>
                    {workspace ? <Ellipsis /> : <Menu />}
                </button>
            </div>
            {open && (
                <nav className="absolute flex w-full flex-col gap-5 border-b border-border bg-background p-6">
                    <Link href="/">{__('Home')}</Link>
                    <Link href="/projects">{__('My projects')}</Link>
                    <a href="/#herramientas">{__('The GAMERDUST universe')}</a>
                    {user && (
                        <>
                            <Link href="/account" className="sm:hidden">
                                {user.name}
                            </Link>
                            <button type="button" onClick={() => router.post('/logout')} className="text-left sm:hidden">
                                {__('Log out')}
                            </button>
                        </>
                    )}
                    <LocaleSwitcher className="sm:hidden" />
                </nav>
            )}
        </header>
    );
}
