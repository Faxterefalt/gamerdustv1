<?php

namespace App\Services\Branching;

use App\Models\BranchingVariable;
use App\Models\DialogueOption;
use App\Models\Project;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Variables del recorrido. Las opciones las referencian por `key`, así que:
 * - renombrar reescribe la clave en las condiciones y efectos del proyecto (como las {{referencias}});
 * - no se puede borrar ni cambiar de tipo una variable en uso (422 con el número de opciones).
 */
class BranchingVariableService
{
    public function __construct(private readonly BranchingStateEvaluator $evaluator) {}

    public function create(Project $project, array $data): BranchingVariable
    {
        return $project->branchingVariables()->create([
            ...$data,
            'initial_value' => $this->evaluator->coerce($data['type'], $data['initial_value']),
        ]);
    }

    /**
     * @return int opciones reescritas por el cambio de clave
     */
    public function update(BranchingVariable $variable, array $data): int
    {
        return DB::transaction(function () use ($variable, $data): int {
            Project::whereKey($variable->project_id)->lockForUpdate()->first();
            $variable->refresh();

            $users = $this->optionsUsing($variable);
            $type = $data['type'] ?? $variable->type;

            if ($type !== $variable->type && $users->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'type' => trans_choice('The type cannot change while :count option uses this variable.|The type cannot change while :count options use this variable.', $users->count()),
                ]);
            }

            $initial = $this->evaluator->coerce($type, $data['initial_value'] ?? $variable->initial_value);

            if ($initial === null) {
                throw ValidationException::withMessages(['initial_value' => $type === 'bool' ? __('The initial value must be true or false.') : __('The initial value must be a number.')]);
            }

            $oldKey = $variable->key;
            $variable->update([...$data, 'type' => $type, 'initial_value' => $initial]);

            if ($variable->key === $oldKey) {
                return 0;
            }

            foreach ($users as $option) {
                $condition = $option->condition;
                if (($condition['var'] ?? null) === $oldKey) {
                    $condition['var'] = $variable->key;
                }

                $effects = array_map(fn (array $effect) => ($effect['var'] ?? null) === $oldKey ? [...$effect, 'var' => $variable->key] : $effect, $option->effects ?? []);
                $option->update(['condition' => $condition, 'effects' => $effects ?: null]);
            }

            return $users->count();
        });
    }

    public function delete(BranchingVariable $variable): void
    {
        DB::transaction(function () use ($variable): void {
            Project::whereKey($variable->project_id)->lockForUpdate()->first();
            $count = $this->optionsUsing($variable)->count();

            if ($count > 0) {
                throw ValidationException::withMessages([
                    'variable' => trans_choice('It is used by :count option: remove it from its condition or effects first.|It is used by :count options: remove it from their conditions or effects first.', $count),
                ]);
            }

            $variable->delete();
        });
    }

    /**
     * Opciones del proyecto cuya condición o efectos usan la variable (filtrado en PHP: JSON portable).
     *
     * @return Collection<int, DialogueOption>
     */
    public function optionsUsing(BranchingVariable $variable): Collection
    {
        return DialogueOption::query()
            ->whereHas('dialogueNode', fn ($query) => $query->where('project_id', $variable->project_id))
            ->where(fn ($query) => $query->whereNotNull('condition')->orWhereNotNull('effects'))
            ->get()
            ->filter(fn (DialogueOption $option) => ($option->condition['var'] ?? null) === $variable->key
                || collect($option->effects ?? [])->contains(fn (array $effect) => ($effect['var'] ?? null) === $variable->key))
            ->values();
    }
}
