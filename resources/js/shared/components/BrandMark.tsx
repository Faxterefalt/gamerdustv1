/**
 * Marca de Gamerdust: una rama de diálogo dibujada en una rejilla de 16 × 16 píxeles (la misma que el favicon).
 * Tres nodos y dos caminos: la historia que se bifurca. Usa currentColor.
 */
const PIXELS: Array<[number, number, number?, number?]> = [
    // [x, y, ancho, alto]
    [2, 1, 3, 3], // nodo de partida
    [3, 4, 1, 8], // tronco
    [2, 12, 3, 3], // nodo final
    [11, 2, 3, 3], // nodo de la rama
    [12, 5, 1, 2], // rama que baja
    [11, 7, 1, 1],
    [10, 8, 1, 1],
    [5, 9, 5, 1], // rama que vuelve al tronco
    [4, 9, 1, 1],
];

export default function BrandMark({ size = 32, className = '' }: { size?: number; className?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" className={className}>
            {PIXELS.map(([x, y, w = 1, h = 1]) => (
                <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} fill="currentColor" />
            ))}
        </svg>
    );
}
