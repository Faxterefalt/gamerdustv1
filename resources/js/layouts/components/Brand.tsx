import { Link } from '@inertiajs/react';
import BrandMark from '../../shared/components/BrandMark';

/** Logotipo: la rama pixelada y el nombre en Pixelify Sans (acento de la marca). */
export default function Brand() {
    return (
        <Link href="/" aria-label="Gamerdust" className="flex min-h-11 items-center gap-2.5 font-pixel text-2xl text-foreground">
            <BrandMark size={28} className="text-primary" />
            <span aria-hidden="true">GAMERDUST</span>
        </Link>
    );
}
