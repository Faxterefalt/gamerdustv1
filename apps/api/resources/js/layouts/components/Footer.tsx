import Brand from './Brand';

export default function Footer() {
    return (
        <footer className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-5 border-t border-border px-6 py-8 text-xs text-[#879080] lg:px-16">
            <Brand />
            <span>Hecho para quienes construyen otros mundos.</span>
            <span className="font-mono text-[10px]">© 2026 GAMERDUST · TODOS LOS MUNDOS POSIBLES</span>
        </footer>
    );
}
