import { __ } from '../../shared/lib/i18n';
import Brand from './Brand';

export default function Footer() {
    return (
        <footer className="border-t border-border">
            <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-8 text-sm text-subtle sm:px-6 lg:px-16">
                <Brand />
                <p>{__('Made for those who build other worlds.')}</p>
                <p>{__('© 2026 Gamerdust')}</p>
            </div>
        </footer>
    );
}
