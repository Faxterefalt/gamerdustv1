<?php

namespace App\Services\Reports;

use App\Models\EmotionalAnalysis;
use App\Models\NarrativeValidation;
use App\Models\Project;
use App\Models\Scene;
use App\Models\SceneVersion;
use App\Services\Emotion\EmotionChangeDetector;
use App\Services\Emotion\EmotionTranslator;
use App\Services\Emotion\SceneContextBuilder;
use App\Services\Narrative\NarrativeValidationService;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Reporte imprimible de análisis (HU 57): métricas emocionales por escena en lenguaje narrativo,
 * alertas, incoherencias, sugerencias y validaciones por estado. Solo lee (no llama a la IA ni
 * toca el guion) y solo consulta filas del proyecto indicado.
 *
 * "VAD invisible": se traducen v/a/d a Tono/Tensión/Control; los números nunca salen de aquí.
 */
class AnalysisReportService
{
    public function __construct(
        private readonly SceneContextBuilder $contexts,
        private readonly EmotionTranslator $translator,
        private readonly NarrativeValidationService $validations,
    ) {}

    public function build(Project $project): array
    {
        $scenes = $project->scenes()->reorder()->orderBy('order')->orderBy('id')->get();
        $codes = $scenes->values()->mapWithKeys(fn (Scene $scene, int $index) => [$scene->id => $this->contexts->code($index)]);
        $names = $project->characters()->pluck('name', 'id');

        // Último análisis de cada escena (los antiguos sin hash son de la simulación y no se mezclan).
        $analyses = EmotionalAnalysis::query()
            ->where('project_id', $project->id)
            ->where('analyzable_type', Scene::class)
            ->whereIn('analyzable_id', $scenes->pluck('id'))
            ->whereNotNull('content_hash')
            ->latest('id')
            ->get()
            ->unique('analyzable_id')
            ->keyBy('analyzable_id');

        $versions = SceneVersion::query()
            ->whereIn('id', $analyses->pluck('scene_version_id')->filter())
            ->whereIn('scene_id', $scenes->pluck('id'))
            ->get(['id', 'scene_id', 'created_at'])
            ->keyBy('id');

        $rows = $scenes->map(fn (Scene $scene) => $this->scene($scene, $analyses->get($scene->id), $versions, $codes, $names))->values();
        $analyzed = $rows->filter(fn (array $row) => $row['analysis'] !== null);

        return [
            'generated_at' => now(),
            'scenes' => $rows->all(),
            'alerts' => $this->alerts($analyzed),
            'summary' => [
                'scenes' => $rows->count(),
                'analyzed' => $analyzed->count(),
                'stale' => $analyzed->filter(fn (array $row) => $row['analysis']['stale'])->count(),
                'red' => $this->countAlerts($analyzed, EmotionChangeDetector::RED),
                'amber' => $this->countAlerts($analyzed, EmotionChangeDetector::AMBER),
                'inconsistencies' => $analyzed->sum(fn (array $row) => count($row['analysis']['inconsistencies'])),
                'suggestions' => $analyzed->sum(fn (array $row) => count($row['analysis']['suggestions'])),
            ],
            'validations' => $this->validationsByStatus($project),
        ];
    }

    private function scene(Scene $scene, ?EmotionalAnalysis $analysis, Collection $versions, Collection $codes, Collection $names): array
    {
        $row = ['id' => $scene->id, 'code' => $codes[$scene->id], 'title' => $scene->title, 'act' => $scene->act, 'analysis' => null];

        if (! $analysis) {
            return $row;
        }

        $result = $analysis->result ?? [];
        $state = $result['scene'] ?? [];
        $version = $versions->get($analysis->scene_version_id);
        $previous = $state['change']['previous']['scene_id'] ?? null;

        $row['analysis'] = [
            'date' => $analysis->created_at,
            'source' => $analysis->source === 'groq' ? __('AI') : __('Keywords'),
            'degraded' => (bool) $analysis->degraded,
            'version' => $version ? ['id' => $version->id, 'date' => $version->created_at] : null,
            // Si el guion o su contexto cambiaron después, el análisis está desactualizado.
            'stale' => $analysis->content_hash !== $this->contexts->contentHash($scene),
            ...$this->state($state),
            'summary' => $state['summary'] ?? '',
            'evidence' => $state['evidence'] ?? '',
            'alert' => $state['change']['alert'] ?? null,
            'alert_explanation' => $state['change']['explanation'] ?? '',
            'previous_code' => $previous ? ($codes[$previous] ?? null) : null,
            'characters' => array_map(fn (array $character) => [
                'name' => $names[$character['character_id'] ?? 0] ?? ($character['name'] ?? ''),
                ...$this->state($character),
                'evidence' => $character['evidence'] ?? '',
                'out_of_character' => (bool) ($character['out_of_character'] ?? false),
                'out_of_character_reason' => $character['out_of_character_reason'] ?? '',
                'alert' => $character['change']['alert'] ?? null,
                'alert_explanation' => $character['change']['explanation'] ?? '',
            ], $result['characters'] ?? []),
            'inconsistencies' => array_map(fn (array $item) => [
                'fragment' => $item['fragment'] ?? '',
                'contradicts' => $item['contradicts'] ?? '',
                'explanation' => $item['explanation'] ?? '',
                'severity' => $this->severityLabel($item['severity'] ?? ''),
            ], $result['inconsistencies'] ?? []),
            'suggestions' => array_map(fn (array $item) => [
                'kind' => __(Str::ucfirst($item['kind'] ?? 'emotion')),
                'text' => $item['text'] ?? '',
                'why' => $item['why'] ?? '',
            ], $result['suggestions'] ?? []),
        ];

        return $row;
    }

    /**
     * Emoción y etiquetas narrativas de un estado (escena o personaje).
     *
     * @return array{emotion: string, tone: string, tension: string, control: string}
     */
    private function state(array $state): array
    {
        $labels = $this->translator->labels((float) ($state['v'] ?? 0.5), (float) ($state['a'] ?? 0.5), (float) ($state['d'] ?? 0.5));

        return [
            'emotion' => __(Str::ucfirst($state['emotion'] ?? 'neutral')),
            'tone' => __($labels['tone']),
            'tension' => __($labels['tension']),
            'control' => __($labels['control']),
        ];
    }

    /**
     * Cambios abruptos de la escena y de sus personajes: rojo = sin causa visible, ámbar = justificado.
     */
    private function alerts(Collection $analyzed): array
    {
        $alerts = [];

        foreach ($analyzed as $row) {
            $analysis = $row['analysis'];

            if ($analysis['alert']) {
                $alerts[] = ['level' => $analysis['alert'], 'code' => $row['code'], 'title' => $row['title'], 'who' => null, 'explanation' => $analysis['alert_explanation']];
            }

            foreach ($analysis['characters'] as $character) {
                if ($character['alert']) {
                    $alerts[] = ['level' => $character['alert'], 'code' => $row['code'], 'title' => $row['title'], 'who' => $character['name'], 'explanation' => $character['alert_explanation']];
                }
            }
        }

        // Primero las rojas.
        usort($alerts, fn (array $a, array $b) => [$a['level'] !== EmotionChangeDetector::RED, $a['code']] <=> [$b['level'] !== EmotionChangeDetector::RED, $b['code']]);

        return $alerts;
    }

    private function countAlerts(Collection $analyzed, string $level): int
    {
        return $analyzed->sum(fn (array $row) => (int) ($row['analysis']['alert'] === $level)
            + count(array_filter($row['analysis']['characters'], fn (array $character) => $character['alert'] === $level)));
    }

    /**
     * Validaciones por regla agrupadas por estado. Se ejecutan las reglas antes (como en el Panel y
     * en Análisis IA) para que las pendientes reflejen el estado actual del proyecto.
     *
     * @return array<string, list<array>>
     */
    private function validationsByStatus(Project $project): array
    {
        $this->validations->run($project);

        $groups = array_fill_keys(NarrativeValidation::STATUSES, []);

        $project->narrativeValidations()->with('subject')->latest('updated_at')->get()
            ->each(function (NarrativeValidation $validation) use (&$groups): void {
                $groups[$validation->status][] = [
                    'message' => $validation->message,
                    'recommendation' => $validation->recommendation,
                    'severity' => $this->severityLabel($validation->severity),
                    'subject' => $validation->link()['label'] ?? null,
                    'date' => $validation->updated_at,
                ];
            });

        return $groups;
    }

    private function severityLabel(string $severity): string
    {
        return __(Str::ucfirst($severity ?: 'medium'));
    }
}
