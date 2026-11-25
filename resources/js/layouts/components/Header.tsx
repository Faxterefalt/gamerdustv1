import { Link, router, usePage } from '@inertiajs/react';
import { Ellipsis, Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { PageProps } from '../../features/projects/projects.types';
import { __ } from '../../shared/lib/i18n';
import { iconButton } from '../../shared/lib/styles';
import Brand from './Brand';
import LocaleSwitcher from './LocaleSwitcher';

interface HeaderProps {
    /** En el estudio de proyecto: botón hamburguesa que abre/pliega el sidebar. */
    onToggleSidebar?: () => void;
    sidebarExpanded?: boolean;
}

const navLink = 'inline-flex min-h-11 items-center text-sm transition-colors';

export default function Header({ onToggleSidebar, sidebarExpanded }: HeaderProps) {
    const { url, props } = usePage<PageProps>();
    const [open, setOpen] = useState(false);
    const user = props.auth?.user;
    const workspace = onToggleSidebar !== undefined;
    const isActive = (path: string) => url === path || (path !== '/' && url.startsWith(path));
    const linkClass = (path: string) => `${navLink} ${isActive(path) ? 'text-foreground' : 'text-muted hover:text-foreground'}`;

    return (
        <header className={`z-30 border-b border-border bg-background ${workspace ? 'sticky top-0' : 'relative'}`}>
            <div className={`mx-auto flex h-(--header-h) items-center justify-between gap-4 ${workspace ? 'px-4 sm:px-6' : 'max-w-[1360px] px-4 sm:px-6 lg:px-16'}`}>
                <div className="flex items-center gap-3">
                    {workspace && (
                        <button
                            type="button"
                            onClick={onToggleSidebar}
                            aria-label={__('Toggle project menu')}
                            aria-expanded={sidebarExpanded}
                            aria-controls="desktop-project-sidebar mobile-project-sidebar"
                            className={`${iconButton} border border-border`}
                        >
                            <Menu size={20} />
                        </button>
                    )}
                    <Brand />
                </div>
                <nav aria-label={__('Main navigation')} className="hidden items-center gap-8 md:flex">
                    <Link className={linkClass('/')} aria-current={url === '/' ? 'page' : undefined} href="/">
                        {__('Home')}
                    </Link>
                    <a href="/#herramientas" className={`${navLink} text-muted hover:text-foreground`}>
                        {__('The GAMERDUST universe')}
                    </a>
                    <Link className={linkClass('/projects')} aria-current={isActive('/projects') ? 'page' : undefined} href="/projects">
                        {__('My projects')}
                    </Link>
                </nav>
                <div className="hidden items-center gap-6 sm:flex">
                    <LocaleSwitcher />
                    {user ? (
                        <>
                            <Link href="/account" className={linkClass('/account')}>
                                {user.name}
                            </Link>
                            <button type="button" onClick={() => router.post('/logout')} className={`${navLink} text-muted hover:text-foreground`}>
                                {__('Log out')}
                            </button>
                        </>
                    ) : (
                        <Link href="/login" className={`${navLink} font-bold text-primary hover:text-primary-hover`}>
                            {__('Log in')}
                        </Link>
                    )}
                </div>
                <button
                    type="button"
                    aria-label={__('Open navigation')}
                    aria-expanded={open}
                    aria-controls="mobile-navigation"
                    className={`${iconButton} md:hidden`}
                    onClick={() => setOpen(!open)}
                >
                    {open ? <X size={20} /> : workspace ? <Ellipsis size={20} /> : <Menu size={20} />}
                </button>
            </div>
            {open && (
                <nav id="mobile-navigation" aria-label={__('Main navigation')} className="absolute flex w-full flex-col border-b border-border bg-background px-4 pb-4 sm:px-6 md:hidden">
                    <Link href="/" className={linkClass('/')}>
                        {__('Home')}
                    </Link>
                    <Link href="/projects" className={linkClass('/projects')}>
                        {__('My projects')}
                    </Link>
                    <a href="/#herramientas" className={`${navLink} text-muted hover:text-foreground`}>
                        {__('The GAMERDUST universe')}
                    </a>
                    {user ? (
                        <>
                            <Link href="/account" className={`${linkClass('/account')} sm:hidden`}>
                                {user.name}
                            </Link>
                            <button type="button" onClick={() => router.post('/logout')} className={`${navLink} text-left text-muted hover:text-foreground sm:hidden`}>
                                {__('Log out')}
                            </button>
                        </>
                    ) : (
                        <Link href="/login" className={`${navLink} font-bold text-primary sm:hidden`}>
                            {__('Log in')}
                        </Link>
                    )}
                    <LocaleSwitcher className="sm:hidden" />
                </nav>
            )}
        </header>
    );
}
