import { __ } from '../../shared/lib/i18n';
import Brand from './Brand';

export default function Footer() {
    return (
        <footer className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-5 border-t border-border px-6 py-8 text-xs text-[#879080] lg:px-16">
            <Brand />
            <span>{__('Made for those who build other worlds.')}</span>
            <span className="font-mono text-[10px]">{__('© 2026 GAMERDUST · ALL POSSIBLE WORLDS')}</span>
        </footer>
    );
}
