<?php

namespace App\Console\Commands;

use App\Models\AiFeedback;
use App\Models\AiGeneration;
use App\Models\CharacterEmotionalState;
use App\Models\EmotionalAnalysis;
use App\Models\Project;
use App\Models\Scene;
use App\Services\Emotion\EmotionChangeDetector;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;

/**
 * Métricas de uso de la IA para el capítulo de evaluación (OE4), exportadas a CSV:
 * llamadas por tipo y estado, tokens y latencia media, análisis por origen,
 * porcentaje de sugerencias útiles y alertas rojas/ámbar.
 */
class AiMetricsCommand extends Command
{
    protected $signature = 'gamerdust:ai-metrics
        {project? : ID del proyecto (todos si se omite)}
        {--output= : Ruta del CSV (por defecto storage/app/ai-metrics/...)}';

    protected $description = 'Exporta a CSV las métricas de uso y valoración de la IA emocional';

    public function handle(): int
    {
        $projectId = $this->argument('project');

        if ($projectId !== null && ! Project::whereKey($projectId)->exists()) {
            $this->error("No existe el proyecto {$projectId}.");

            return self::FAILURE;
        }

        $rows = $this->metrics($projectId === null ? null : (int) $projectId);
        $path = $this->option('output') ?: storage_path('app/ai-metrics/ai-metrics-'.($projectId ?? 'all').'-'.now()->format('Ymd-His').'.csv');

        if (! is_dir(dirname($path))) {
            mkdir(dirname($path), 0755, true);
        }

        $handle = fopen($path, 'w');
        fputcsv($handle, ['metric', 'group', 'value'], escape: '\\');
        foreach ($rows as $row) {
            fputcsv($handle, $row, escape: '\\');
        }
        fclose($handle);

        $this->table(['Métrica', 'Grupo', 'Valor'], $rows);
        $this->info("CSV guardado en {$path}");

        return self::SUCCESS;
    }

    /**
     * @return list<array{0: string, 1: string, 2: string|int|float}>
     */
    private function metrics(?int $projectId): array
    {
        $scope = fn (Builder $query) => $projectId ? $query->where('project_id', $projectId) : $query;
        $rows = [];

        // Llamadas a la IA: tipo y estado (ok, fallback, degraded, error).
        $generations = $scope(AiGeneration::query())->get(['generation_type', 'status', 'total_tokens', 'latency_ms']);
        foreach ($generations->groupBy(fn ($generation) => "{$generation->generation_type}:{$generation->status}")->sortKeys() as $group => $items) {
            $rows[] = ['ai_calls', $group, $items->count()];
        }
        foreach ($generations->groupBy('generation_type')->sortKeys() as $type => $items) {
            $answered = $items->whereIn('status', ['ok', 'fallback']);
            $rows[] = ['avg_latency_ms', $type, round((float) $answered->avg('latency_ms'), 1)];
            $rows[] = ['avg_total_tokens', $type, round((float) $answered->avg('total_tokens'), 1)];
            $rows[] = ['sum_total_tokens', $type, (int) $items->sum('total_tokens')];
            $rows[] = ['fallback_rate_pct', $type, $this->pct($items->where('status', 'fallback')->count(), $items->count())];
            $rows[] = ['failure_rate_pct', $type, $this->pct($items->whereIn('status', ['degraded', 'error'])->count(), $items->count())];
        }

        // Análisis de escena por origen (solo los de escala 0-1, con content_hash).
        $analyses = $scope(EmotionalAnalysis::query())->where('analyzable_type', Scene::class)->whereNotNull('content_hash')->get(['id', 'analyzable_id', 'source', 'degraded', 'result']);
        foreach ($analyses->groupBy(fn ($analysis) => $analysis->source.($analysis->degraded ? ':degraded' : ''))->sortKeys() as $group => $items) {
            $rows[] = ['scene_analyses', $group, $items->count()];
        }

        // Valoraciones 👍/👎.
        $feedback = $scope(AiFeedback::query())->get(['emotional_analysis_id', 'ai_generation_id', 'useful']);
        $groups = [
            'analysis_suggestions' => $feedback->whereNotNull('emotional_analysis_id'),
            'generations' => $feedback->whereNotNull('ai_generation_id'),
            'all' => $feedback,
        ];
        foreach ($groups as $group => $items) {
            $rows[] = ['feedback_votes', $group, $items->count()];
            $rows[] = ['useful_pct', $group, $this->pct($items->where('useful', true)->count(), $items->count())];
        }

        // Alertas de cambio abrupto (estados vigentes de cada escena) y salidas de personaje.
        $states = $scope(CharacterEmotionalState::query())->get(['abrupt_change', 'change_justified', 'out_of_character']);
        $alerts = $states->map(fn ($state) => EmotionChangeDetector::alertFor($state->abrupt_change, $state->change_justified))->filter();
        $rows[] = ['character_alerts', 'red', $alerts->filter(fn ($alert) => $alert === EmotionChangeDetector::RED)->count()];
        $rows[] = ['character_alerts', 'amber', $alerts->filter(fn ($alert) => $alert === EmotionChangeDetector::AMBER)->count()];
        $rows[] = ['out_of_character', 'characters', $states->where('out_of_character', true)->count()];

        $latest = $analyses->sortByDesc('id')->unique('analyzable_id');
        $sceneAlerts = $latest->map(fn ($analysis) => $analysis->result['scene']['change']['alert'] ?? null)->filter();
        $rows[] = ['scene_alerts', 'red', $sceneAlerts->filter(fn ($alert) => $alert === EmotionChangeDetector::RED)->count()];
        $rows[] = ['scene_alerts', 'amber', $sceneAlerts->filter(fn ($alert) => $alert === EmotionChangeDetector::AMBER)->count()];

        return $rows;
    }

    private function pct(int $part, int $total): float
    {
        return $total ? round($part * 100 / $total, 1) : 0.0;
    }
}
