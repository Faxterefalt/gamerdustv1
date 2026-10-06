import { Link } from '@inertiajs/react';
import { GitBranch } from 'lucide-react';

export default function Brand() {
    return (
        <Link href="/" className="flex items-center gap-2.5 font-display text-[27px] font-bold tracking-[.08em]">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-primary/60 text-primary">
                <GitBranch size={22} />
            </span>
            GAMERDUST <span className="mb-3 text-[8px] text-primary">®</span>
        </Link>
    );
}
