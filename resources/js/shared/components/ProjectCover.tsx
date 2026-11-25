/**
 * Portada de un proyecto sin fotos de stock: las iniciales del título en pixel sobre un pozo tintado.
 * El tinte sale del género (paleta categórica de tokens), así que dos proyectos del mismo género comparten color.
 */
const TINTS: Record<string, string> = {
    Aventura: 'bg-kind-linear/15 text-kind-linear',
    'Fantasía oscura': 'bg-kind-cutscene/15 text-kind-cutscene',
    'Ciencia ficción': 'bg-kind-rubber/15 text-kind-rubber',
    Misterio: 'bg-kind-paths/15 text-kind-paths',
    Terror: 'bg-danger/15 text-danger',
};

export const initials = (title: string) =>
    title
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]!.toUpperCase())
        .join('') || '?';

export default function ProjectCover({ title, genre, size = 'lg', className = '' }: { title: string; genre?: string | null; size?: 'sm' | 'lg'; className?: string }) {
    const tint = TINTS[genre ?? ''] ?? 'bg-primary/10 text-primary';

    return (
        <div aria-hidden="true" className={`flex items-center justify-center font-pixel ${tint} ${size === 'lg' ? 'text-5xl' : 'text-lg'} ${className}`}>
            {initials(title)}
        </div>
    );
}
