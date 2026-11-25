<?php

namespace App\Services\Narrative;

use App\Models\NarrativeValidation;
use App\Models\Project;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Validaciones de coherencia por reglas simples (sin IA).
 *
 * Cada hallazgo tiene una huella (tipo + elemento afectado + causa). En cada ejecución:
 * - las alertas pendientes cuya causa sigue se conservan (se refresca el texto) y las demás se borran;
 * - una alerta resuelta o descartada con la misma huella no se recrea mientras la causa no cambie;
 * - si la causa de una alerta cerrada desaparece, pierde la huella y queda como histórico,
 *   de modo que si el problema vuelve más adelante se crea una alerta nueva.
 */
class NarrativeValidationService
{
    public function __construct(private readonly ProductionUsage $usage) {}

    /**
     * Ejecuta las reglas y devuelve las props del panel de validaciones: las pendientes y las
     * cerradas (resueltas o descartadas) cuya causa sigue presente, que se pueden reabrir.
     *
     * @return array{validations: array<int, array>, closedValidations: array<int, array>}
     */
    public function panel(Project $project): array
    {
        $pending = $this->run($project);
        $closed = $project->narrativeValidations()
            ->where('status', '!=', 'pending')
            ->whereNotNull('fingerprint')
            ->with('subject')
            ->latest('updated_at')
            ->get();

        return [
            'validations' => $pending->map->toPayload()->values()->all(),
            'closedValidations' => $closed->map->toPayload()->values()->all(),
        ];
    }

    /**
     * @return Collection<int, NarrativeValidation> alertas pendientes tras la ejecución
     */
    public function run(Project $project): Collection
    {
        $project->loadMissing(['constraint', 'characters', 'scenes', 'loreEntries.characters:id,name']);

        $findings = collect($this->findings($project))
            ->map(fn (array $finding) => [...$finding, 'fingerprint' => NarrativeValidation::fingerprintFor($finding['validation_type'], $finding['subject'], $finding['cause'] ?? null)])
            ->keyBy('fingerprint');

        DB::transaction(function () use ($project, $findings): void {
            // Serializa ejecuciones simultáneas del mismo proyecto (dos pestañas del Panel).
            Project::whereKey($project->id)->lockForUpdate()->first();

            $seen = [];

            // Primero las cerradas: si una pendiente comparte huella con una cerrada, sobra la pendiente.
            $existing = $project->narrativeValidations()->orderBy('id')->get()->sortBy(fn (NarrativeValidation $validation) => $validation->status === 'pending');

            foreach ($existing as $validation) {
                $finding = $validation->fingerprint ? $findings->get($validation->fingerprint) : null;

                if ($validation->status === 'pending') {
                    if ($finding && ! isset($seen[$validation->fingerprint])) {
                        $validation->update($this->attributes($finding));
                        $seen[$validation->fingerprint] = true;
                    } else {
                        $validation->delete();
                    }

                    continue;
                }

                if ($finding) {
                    $seen[$validation->fingerprint] = true;
                } elseif ($validation->fingerprint) {
                    $validation->update(['fingerprint' => null]);
                }
            }

            foreach ($findings->except(array_keys($seen)) as $fingerprint => $finding) {
                $project->narrativeValidations()->create([
                    ...$this->attributes($finding),
                    'status' => 'pending',
                    'fingerprint' => $fingerprint,
                    'subject_type' => $finding['subject']::class,
                    'subject_id' => $finding['subject']->getKey(),
                ]);
            }
        });

        return $project->narrativeValidations()->pending()->with('subject')->latest()->get();
    }

    /**
     * @return array<int, array{validation_type: string, severity: string, message: string, recommendation: string, subject: Model, cause?: string}>
     */
    private function findings(Project $project): array
    {
        $findings = [];

        if (blank($project->premise)) {
            $findings[] = [
                'validation_type' => 'missing_project_premise',
                'severity' => 'high',
                'subject' => $project,
                'message' => __('The project has no defined premise.'),
                'recommendation' => __('Summarize the dramatic core in a short premise before expanding scenes.'),
            ];
        }

        foreach ($project->characters as $character) {
            if (blank($character->motivation)) {
                $findings[] = [
                    'validation_type' => 'character_without_motivation',
                    'severity' => 'medium',
                    'subject' => $character,
                    'message' => __('The character :name has no motivation.', ['name' => $character->name]),
                    'recommendation' => __('Define what they want, why they want it and what they are willing to sacrifice.'),
                ];
            }
        }

        foreach ($project->scenes as $scene) {
            if (blank($scene->conflict)) {
                $findings[] = [
                    'validation_type' => 'scene_without_conflict',
                    'severity' => 'medium',
                    'subject' => $scene,
                    'message' => __('The scene :title has no clear conflict.', ['title' => $scene->title]),
                    'recommendation' => __('Add a tension, obstacle or decision that drives the scene.'),
                ];
            }
        }

        foreach ($project->loreEntries as $entry) {
            if (blank($entry->narrative_function)) {
                $findings[] = [
                    'validation_type' => 'lore_without_function',
                    'severity' => 'low',
                    'subject' => $entry,
                    'message' => __('The lore entry :title does not state a narrative function.', ['title' => $entry->title]),
                    'recommendation' => __('Connect this piece of the world with characters, conflict or player decisions.'),
                ];
            }

            if ($entry->type !== 'rule') {
                continue;
            }

            // Reglas del mundo: contradicciones entre su rigidez y sus vínculos.
            if ($entry->rigidity === 'unbreakable') {
                foreach ($entry->characters->where('pivot.role', 'breaks') as $character) {
                    $findings[] = [
                        'validation_type' => 'unbreakable_rule_broken',
                        'severity' => 'medium',
                        'subject' => $entry,
                        'cause' => 'character:'.$character->id,
                        'message' => __('The rule :title is unbreakable, but :name breaks it.', ['title' => $entry->title, 'name' => $character->name]),
                        'recommendation' => __('Change the rigidity of the rule or add the case to its exceptions.'),
                    ];
                }
            }

            if ($entry->rigidity === 'costly' && blank($entry->consequence)) {
                $findings[] = [
                    'validation_type' => 'rule_without_consequence',
                    'severity' => 'low',
                    'subject' => $entry,
                    'message' => __('The rule :title can be broken at a cost, but the cost is not defined.', ['title' => $entry->title]),
                    'recommendation' => __('Describe what happens to whoever breaks it so the player feels the risk.'),
                ];
            }
        }

        return [...$findings, ...$this->constraintFindings($project)];
    }

    /**
     * Restricciones de producción (HU 60). Igualar el límite no es exceso y un límite sin
     * configurar (null) no genera alerta. La causa incluye las cifras: si cambian, la alerta es nueva.
     */
    private function constraintFindings(Project $project): array
    {
        $constraint = $project->constraint;

        if (! $constraint) {
            return [];
        }

        $findings = [];
        $limited = $constraint->max_characters !== null || $constraint->max_pages !== null || $constraint->max_budget !== null;
        $current = $limited ? $this->usage->for($project) : [];

        if ($constraint->max_characters !== null && $current['characters'] > $constraint->max_characters) {
            $findings[] = [
                'validation_type' => 'character_limit_exceeded',
                'severity' => 'medium',
                'subject' => $project,
                'cause' => $current['characters'].'/'.$constraint->max_characters,
                'message' => __('The project has :count characters, above the limit of :max.', ['count' => $current['characters'], 'max' => $constraint->max_characters]),
                'recommendation' => __('Merge or remove secondary characters, or raise the limit in the production limits.'),
            ];
        }

        if ($constraint->max_pages !== null && $current['pages'] > $constraint->max_pages) {
            $findings[] = [
                'validation_type' => 'page_limit_exceeded',
                'severity' => 'medium',
                'subject' => $project,
                'cause' => $current['pages'].'/'.$constraint->max_pages,
                'message' => __('The script is estimated at :pages pages (:words words), above the limit of :max.', ['pages' => $current['pages'], 'words' => $current['words'], 'max' => $constraint->max_pages]),
                'recommendation' => __('Trim scenes or raise the page limit. One page is estimated at :per words.', ['per' => (int) config('gamerdust.validation.words_per_page', 250)]),
            ];
        }

        if ($constraint->max_budget !== null && $current['cost_points'] > $constraint->max_budget) {
            $max = self::number($constraint->max_budget);
            $findings[] = [
                'validation_type' => 'budget_exceeded',
                'severity' => 'medium',
                'subject' => $project,
                'cause' => $current['cost_points'].'/'.$max,
                'message' => __('The estimated production cost is :points points, above the budget of :max.', ['points' => $current['cost_points'], 'max' => $max]),
                'recommendation' => __('Reduce branching options or dialogue-heavy scenes, or raise the budget.'),
            ];
        }

        // El giro no se puede comprobar con reglas: es una revisión contextual, no un error.
        if ($constraint->requires_twist) {
            $findings[] = [
                'validation_type' => 'twist_review',
                'severity' => 'review',
                'subject' => $project,
                'message' => __('The brief requires a plot twist. Check that the script includes one.'),
                'recommendation' => __('This is a contextual review, not an error: mark it as resolved once you have checked it.'),
            ];
        }

        return $findings;
    }

    private function attributes(array $finding): array
    {
        return [
            'validation_type' => $finding['validation_type'],
            'severity' => $finding['severity'],
            'message' => $finding['message'],
            'recommendation' => $finding['recommendation'],
        ];
    }

    private static function number(float $value): string
    {
        return rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.');
    }
}
