import { Link, router } from '@inertiajs/react';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { CartesianGrid, ComposedChart, Legend, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis, type DotItemDotProps } from 'recharts';
import { __ } from '../../../shared/lib/i18n';
import { card } from '../../../shared/lib/styles';
import type { EmotionCatalog, EmotionTimeline, LabelBand, TimelinePoint, TimelineScene } from '../emotion.types';
import { emotionLabel } from '../labels';
import { EmotionChip } from './EmotionBits';

// Colores de interfaz del gráfico (no son datos: los colores de emoción llegan del servidor).
const AXIS = '#a2b697';
const GRID = '#2b3828';
const STALE = '#6f7a6c';
const RED = '#ff6b5e';
const TONE_LINE = '#c5ec95';
const TENSION_LINE = '#e9a25b';
const CHARACTER_COLORS = ['#c5ec95', '#6cc4c8', '#f0a6c4', '#c592e8'];
const MAX_CHARACTERS = 4;

/** Marcas del eje: el centro de cada banda, con su palabra (Tono, Tensión...). */
function axisFor(bands: LabelBand[]) {
    const ranges = bands.map(([limit, label], index) => ({ from: index === 0 ? 0 : (bands[index - 1][0] ?? 0), to: limit ?? 1, label }));
    const ticks = ranges.map((range) => Number(((range.from + range.to) / 2).toFixed(3)));

    return {
        ticks,
        format: (value: number) => __(ranges.find((range) => value >= range.from && value <= range.to)?.label ?? ''),
    };
}

const sceneUrl = (projectId: number, sceneId: number) => `/projects/${projectId}/script?scene=${sceneId}`;

interface ChartsProps {
    projectId: number;
    timeline: EmotionTimeline;
    catalog: EmotionCatalog;
}

export default function EvolutionCharts({ projectId, timeline, catalog }: ChartsProps) {
    return (
        <div className="space-y-6">
            <StoryArc projectId={projectId} scenes={timeline.scenes} catalog={catalog} />
            <CharacterEmotions projectId={projectId} timeline={timeline} catalog={catalog} />
        </div>
    );
}

/* ------------------------------------------------------------------ Vista A */

type ArcRow = { code: string; scene: TimelineScene; tone: number | null; tension: number | null };

function StoryArc({ projectId, scenes, catalog }: { projectId: number; scenes: TimelineScene[]; catalog: EmotionCatalog }) {
    const rows: ArcRow[] = scenes.map((scene) => ({ code: scene.code, scene, tone: scene.vad?.v ?? null, tension: scene.vad?.a ?? null }));
    const tone = axisFor(catalog.labels.tone);
    const tension = axisFor(catalog.labels.tension);

    // Bandas de fondo por acto (escenas consecutivas del mismo acto).
    const acts = rows.reduce<{ act: string; from: string; to: string }[]>((list, row) => {
        const act = row.scene.act ?? '';
        const last = list.at(-1);

        if (last && last.act === act) {
            last.to = row.code;
        } else {
            list.push({ act, from: row.code, to: row.code });
        }

        return list;
    }, []);

    const toneDot = ({ cx, cy, payload, index }: DotItemDotProps) => {
        const scene = (payload as ArcRow).scene;

        if (cx == null || cy == null || !scene.emotion) {
            return <g key={`tone-${index}`} />;
        }

        const color = scene.stale ? STALE : (catalog.emotions[scene.emotion]?.color ?? TONE_LINE);

        return (
            <circle
                key={`tone-${index}`}
                cx={cx}
                cy={cy}
                r={6}
                fill={color}
                stroke={scene.alert === 'red' ? RED : '#111812'}
                strokeWidth={scene.alert === 'red' ? 3 : 1.5}
                style={{ cursor: 'pointer' }}
            />
        );
    };

    return (
        <section className={`${card} p-5 sm:p-6`}>
            <h2 className="font-display text-lg">{__('Emotional arc of the story')}</h2>
            <p className="mt-1 text-[11px] leading-5 text-[#a2b697]">{__('The tension line shows pacing: look for rises before the climax and breathers after.')}</p>

            <div className="mt-5 h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={rows}
                        margin={{ top: 10, right: 4, bottom: 0, left: 4 }}
                        onClick={(state) => {
                            const row = rows[Number(state.activeTooltipIndex)];

                            if (row) {
                                router.visit(sceneUrl(projectId, row.scene.id));
                            }
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <CartesianGrid stroke={GRID} vertical={false} />
                        {acts.map((band, index) => (
                            <ReferenceArea key={`${band.act}-${band.from}`} yAxisId="tone" x1={band.from} x2={band.to} fill={TONE_LINE} fillOpacity={index % 2 ? 0.05 : 0.015} stroke="none" />
                        ))}
                        <XAxis dataKey="code" tick={{ fill: AXIS, fontSize: 10 }} stroke={GRID} />
                        <YAxis yAxisId="tone" domain={[0, 1]} ticks={tone.ticks} tickFormatter={tone.format} tick={{ fill: AXIS, fontSize: 9 }} width={84} stroke={GRID} />
                        <YAxis yAxisId="tension" orientation="right" domain={[0, 1]} ticks={tension.ticks} tickFormatter={tension.format} tick={{ fill: AXIS, fontSize: 9 }} width={52} stroke={GRID} />
                        <Tooltip content={({ active, payload }) => (active ? <ArcTooltip row={payload?.[0]?.payload as ArcRow | undefined} catalog={catalog} /> : null)} />
                        <Legend wrapperStyle={{ fontSize: 11, color: AXIS }} />
                        <Line yAxisId="tone" type="monotone" dataKey="tone" name={__('Tone')} stroke={TONE_LINE} strokeWidth={2} connectNulls={false} dot={toneDot} activeDot={false} isAnimationActive={false} />
                        <Line
                            yAxisId="tension"
                            type="monotone"
                            dataKey="tension"
                            name={__('Tension')}
                            stroke={TENSION_LINE}
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            connectNulls={false}
                            dot={{ r: 3, fill: TENSION_LINE, stroke: 'none' }}
                            activeDot={false}
                            isAnimationActive={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Alternativa accesible y atajo al guion: cada escena con su emoción. */}
            <ul className="mt-5 flex flex-wrap gap-2" aria-label={__('Scenes of the arc')}>
                {scenes.map((scene) => (
                    <li key={scene.id}>
                        <Link
                            href={sceneUrl(projectId, scene.id)}
                            className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[10px] transition hover:border-primary/40 ${scene.alert === 'red' ? 'border-red-300/40' : 'border-border'} ${scene.stale ? 'opacity-60' : ''}`}
                        >
                            <span className="font-mono text-primary">{scene.code}</span>
                            {scene.emotion ? <span>{emotionLabel(scene.emotion)}</span> : <span className="text-[#93a886]">{__('Not analyzed')}</span>}
                            {scene.alert === 'red' && <AlertTriangle size={11} className="text-[#f3baa5]" aria-label={__('Tone jump with no visible cause')} />}
                        </Link>
                    </li>
                ))}
            </ul>
            <p className="mt-3 text-[10px] text-[#93a886]">{__('Gaps are scenes not analyzed yet; grey points are analyses older than the current text. Click a scene to open it in the Script.')}</p>
        </section>
    );
}

function ArcTooltip({ row, catalog }: { row?: ArcRow; catalog: EmotionCatalog }) {
    if (!row) {
        return null;
    }

    const { scene } = row;

    return (
        <TooltipBox>
            <p className="font-mono text-[9px] text-primary">
                {scene.code}
                {scene.act ? ` · ${scene.act}` : ''}
            </p>
            <p className="text-xs font-medium">{scene.title}</p>
            {scene.emotion && scene.labels ? (
                <>
                    <EmotionChip emotion={scene.emotion} catalog={catalog} size="sm" />
                    <p className="text-[10px]">
                        {__('Tone')}: {scene.labels.tone} · {__('Tension')}: {scene.labels.tension}
                    </p>
                    {scene.stale && <p className="text-[10px] text-[#e7d6a4]">{__('The text changed after this analysis.')}</p>}
                    {scene.alert === 'red' && <p className="text-[10px] text-[#f3baa5]">{__('Tone jump with no visible cause')}</p>}
                </>
            ) : (
                <p className="text-[10px] text-[#93a886]">{__('Not analyzed')}</p>
            )}
        </TooltipBox>
    );
}

/* ------------------------------------------------------------------ Vista B */

type CharacterRow = { key: string; label: string; sceneId: number | null; title: string } & Record<string, unknown>;

function CharacterEmotions({ projectId, timeline, catalog }: ChartsProps) {
    const { characters, scenes, reviews } = timeline;
    const [selected, setSelected] = useState<number[]>(() =>
        characters
            .filter((character) => character.points.some((point) => point.origin === 'ai'))
            .slice(0, 2)
            .map((character) => character.id),
    );
    const tone = axisFor(catalog.labels.tone);
    const shown = characters.filter((character) => selected.includes(character.id));

    // Eje X: "Inicio" + E01, E02... Sin valor donde el personaje no aparece (no se interpola).
    const columns: CharacterRow[] = [
        { key: 'start', label: __('Start'), sceneId: null, title: __('Starting state') },
        ...scenes.map((scene) => ({ key: scene.code, label: scene.code, sceneId: scene.id, title: scene.title })),
    ];
    const rows = columns.map((column) => {
        const row: CharacterRow = { ...column };

        for (const character of shown) {
            const point = character.points.find((item) => (column.sceneId === null ? item.origin === 'author' : item.scene_id === column.sceneId));
            row[`c${character.id}`] = point ? point.vad.v : null;
            row[`p${character.id}`] = point ?? null;
        }

        return row;
    });

    const toggle = (id: number) => setSelected((list) => (list.includes(id) ? list.filter((item) => item !== id) : list.length < MAX_CHARACTERS ? [...list, id] : list));
    const colorOf = (id: number) => CHARACTER_COLORS[selected.indexOf(id) % CHARACTER_COLORS.length];

    const dotFor = (characterId: number, color: string) =>
        function CharacterDot({ cx, cy, payload, index }: DotItemDotProps) {
            const point = (payload as CharacterRow)[`p${characterId}`] as TimelinePoint | null;

            if (cx == null || cy == null || !point) {
                return <g key={`${characterId}-${index}`} />;
            }

            // El tamaño del punto representa la tensión; "Inicio" (autor) va hueco.
            const radius = 3.5 + point.vad.a * 7;
            const author = point.origin === 'author';

            return (
                <g key={`${characterId}-${index}`} opacity={point.stale ? 0.45 : 1}>
                    {point.alert === 'red' && <circle cx={cx} cy={cy} r={radius + 4} fill="none" stroke={RED} strokeWidth={2} />}
                    <circle cx={cx} cy={cy} r={radius} fill={author ? '#151d16' : color} stroke={color} strokeWidth={author ? 2.5 : 1} />
                </g>
            );
        };

    return (
        <section className={`${card} p-5 sm:p-6`}>
            <h2 className="font-display text-lg">{__('Character emotions')}</h2>
            <p className="mt-1 text-[11px] leading-5 text-[#a2b697]">{__('From the state you set for each character to what the AI detected in each scene.')}</p>

            {characters.length ? (
                <>
                    <fieldset className="mt-5">
                        <legend className="mb-2 text-[10px] text-[#a2b697]">{__('Compare up to :count characters', { count: MAX_CHARACTERS })}</legend>
                        <div className="flex flex-wrap gap-2">
                            {characters.map((character) => {
                                const on = selected.includes(character.id);

                                return (
                                    <button
                                        key={character.id}
                                        type="button"
                                        aria-pressed={on}
                                        disabled={!on && selected.length >= MAX_CHARACTERS}
                                        onClick={() => toggle(character.id)}
                                        className={`flex min-h-9 items-center gap-2 rounded-full border px-3 text-[11px] transition disabled:opacity-35 ${on ? 'border-primary/40 bg-primary/10 text-foreground' : 'border-border text-[#a9ba9e] hover:border-primary/30'}`}
                                    >
                                        <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: on ? colorOf(character.id) : '#3a4835' }} />
                                        {character.name}
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>

                    <div className="mt-5 h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={rows} margin={{ top: 14, right: 12, bottom: 0, left: 4 }}>
                                <CartesianGrid stroke={GRID} vertical={false} />
                                <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 10 }} stroke={GRID} />
                                <YAxis domain={[0, 1]} ticks={tone.ticks} tickFormatter={tone.format} tick={{ fill: AXIS, fontSize: 9 }} width={84} stroke={GRID} />
                                <Tooltip content={({ active, payload }) => (active ? <CharacterTooltip row={payload?.[0]?.payload as CharacterRow | undefined} characters={shown} catalog={catalog} /> : null)} />
                                {shown.map((character) => {
                                    const color = colorOf(character.id);

                                    return (
                                        <Line
                                            key={character.id}
                                            type="monotone"
                                            dataKey={`c${character.id}`}
                                            name={character.name}
                                            stroke={color}
                                            strokeWidth={2}
                                            connectNulls={false}
                                            dot={dotFor(character.id, color)}
                                            activeDot={false}
                                            isAnimationActive={false}
                                        />
                                    );
                                })}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="mt-3 text-[10px] leading-5 text-[#93a886]">
                        {__('Vertical axis: tone. Point size: tension. Hollow point: set by you; filled point: detected by AI; red ring: abrupt change with no visible cause.')}
                    </p>
                </>
            ) : (
                <p className="mt-5 text-xs leading-6 text-[#a6b99a]">{__('Set the starting emotion of your characters in the Narrative Bible, or analyze scenes where they appear.')}</p>
            )}

            <div className="mt-6 border-t border-border pt-5">
                <h3 className="text-[11px] font-medium text-[#dce6d5]">{__('Moments to review')}</h3>
                {reviews.length ? (
                    <ul className="mt-3 space-y-2">
                        {reviews.map((review, index) => (
                            <li key={index}>
                                <Link href={sceneUrl(projectId, review.scene_id)} className="flex items-start gap-3 rounded-md border border-red-300/25 bg-red-400/5 p-3 text-[11px] leading-5 hover:border-red-300/45">
                                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#f3baa5]" />
                                    <span className="min-w-0 flex-1">
                                        <span className="font-mono text-[10px] text-primary">{review.code}</span> {review.title}
                                        {review.name && <span className="text-[#f3baa5]"> · {review.name}</span>}
                                        <span className="block text-[#c3d0b9]">{review.explanation || __('Abrupt emotional change with no visible cause in the scene')}</span>
                                    </span>
                                    <ArrowUpRight size={14} className="shrink-0 text-primary" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-2 text-[11px] text-[#93a886]">{__('No abrupt changes without a cause. Well done!')}</p>
                )}
            </div>
        </section>
    );
}

function CharacterTooltip({ row, characters, catalog }: { row?: CharacterRow; characters: EmotionTimeline['characters']; catalog: EmotionCatalog }) {
    if (!row) {
        return null;
    }

    const entries = characters.map((character) => ({ character, point: row[`p${character.id}`] as TimelinePoint | null })).filter((entry) => entry.point);

    return (
        <TooltipBox>
            <p className="font-mono text-[9px] text-primary">{row.label}</p>
            <p className="text-xs font-medium">{row.title}</p>
            {!entries.length && <p className="text-[10px] text-[#93a886]">{__('None of the selected characters appears here.')}</p>}
            {entries.map(({ character, point }) => (
                <div key={character.id} className="border-t border-border pt-2">
                    <p className="flex flex-wrap items-center gap-2 text-[11px] font-medium">
                        {character.name} <EmotionChip emotion={point!.emotion} catalog={catalog} size="sm" />
                        <span className="text-[9px] font-normal text-[#a2b697]">{point!.origin === 'author' ? __('Set by you') : __('Detected by AI')}</span>
                    </p>
                    <p className="mt-1 text-[10px]">
                        {__('Tone')}: {point!.labels.tone} · {__('Tension')}: {point!.labels.tension} · {__('Character control')}: {point!.labels.control}
                    </p>
                    {point!.evidence && <p className="mt-1 font-mono text-[10px] italic text-[#b6c6aa]">“{point!.evidence}”</p>}
                    {point!.explanation && <p className="mt-1 text-[10px] text-[#c3d0b9]">{point!.explanation}</p>}
                    {point!.alert === 'red' && <p className="mt-1 text-[10px] text-[#f3baa5]">{__('Abrupt emotional change with no visible cause in the scene')}</p>}
                    {point!.stale && <p className="mt-1 text-[10px] text-[#e7d6a4]">{__('The text changed after this analysis.')}</p>}
                </div>
            ))}
        </TooltipBox>
    );
}

function TooltipBox({ children }: { children: ReactNode }) {
    return <div className="max-w-[300px] space-y-1.5 rounded-lg border border-border bg-[#172018] p-3 text-foreground shadow-xl">{children}</div>;
}
