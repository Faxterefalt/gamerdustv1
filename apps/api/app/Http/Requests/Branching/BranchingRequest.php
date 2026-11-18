<?php

namespace App\Http\Requests\Branching;

use App\Models\BranchingVariable;
use App\Models\DialogueNode;
use App\Models\DialogueOption;
use App\Models\Project;
use App\Services\Branching\BranchingStateEvaluator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

abstract class BranchingRequest extends FormRequest
{
    public function authorize(): bool
    {
        $project = $this->route('project');

        if (! $project instanceof Project || ! $this->user()?->can('update', $project)) {
            return false;
        }

        $node = $this->route('node');
        $option = $this->route('option');
        $variable = $this->route('variable');

        abort_if($node instanceof DialogueNode && $node->project_id !== $project->id, 404);
        abort_if($option instanceof DialogueOption && ! $option->dialogueNode()->where('project_id', $project->id)->exists(), 404);
        abort_if($variable instanceof BranchingVariable && $variable->project_id !== $project->id, 404);

        return true;
    }

    protected function project(): Project
    {
        return $this->route('project');
    }

    protected function nodeFieldRules(bool $partial): array
    {
        $project = $this->project();
        $prefix = $partial ? ['sometimes'] : [];

        return [
            'scene_id' => [...$prefix, 'nullable', Rule::exists('scenes', 'id')->where('project_id', $project->id)],
            'character_id' => [...$prefix, 'nullable', Rule::exists('characters', 'id')->where('project_id', $project->id)],
            'dialogue_type' => [...$prefix, $partial ? 'required' : 'nullable', Rule::in(DialogueNode::TYPES)],
            'text' => [...$prefix, 'nullable', 'string', 'max:65000'],
            'emotional_tone' => [...$prefix, 'nullable', 'string', 'max:255'],
            'trigger_condition' => [...$prefix, 'nullable', 'string', 'max:65000'],
            'pos_x' => [...$prefix, 'nullable', 'numeric', 'between:-1000000,1000000'],
            'pos_y' => [...$prefix, 'nullable', 'numeric', 'between:-1000000,1000000'],
            'is_start' => [...$prefix, 'boolean'],
            'is_ending' => [...$prefix, 'boolean'],
            // Entradas de la Biblia vinculadas (HU 20): deben ser del mismo proyecto.
            'lore_entry_ids' => [...$prefix, 'array', 'max:100'],
            'lore_entry_ids.*' => ['integer', 'distinct', Rule::exists('lore_entries', 'id')->where('project_id', $project->id)],
        ];
    }

    protected function optionRules(bool $partial): array
    {
        $prefix = $partial ? ['sometimes'] : [];

        return [
            'player_option' => [...$prefix, 'required', 'string', 'max:2000'],
            'next_dialogue_node_id' => [...$prefix, 'nullable', 'integer', Rule::exists('dialogue_nodes', 'id')->where('project_id', $this->project()->id)],
            'consequence' => [...$prefix, 'nullable', 'string', 'max:65000'],
            'required_condition' => [...$prefix, 'nullable', 'string', 'max:65000'],
            // Condición y efectos estructurados (HU 19); el tipo de cada operación se valida en after().
            'condition' => [...$prefix, 'nullable', 'array:var,op,value'],
            'condition.var' => ['required_with:condition', 'string', 'max:64'],
            'condition.op' => ['required_with:condition', Rule::in(BranchingStateEvaluator::CONDITION_OPS)],
            'condition.value' => ['required_with:condition'],
            'effects' => [...$prefix, 'nullable', 'array', 'max:20'],
            'effects.*' => ['array:var,op,value'],
            'effects.*.var' => ['required', 'string', 'max:64'],
            'effects.*.op' => ['required', Rule::in(BranchingStateEvaluator::EFFECT_OPS)],
            'effects.*.value' => ['present'],
        ];
    }

    /**
     * Comprueba que cada variable usada exista en el proyecto y que el operador y el valor
     * correspondan a su tipo (bool: == != / set con true|false; number: todos con un número).
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty() || (! $this->filled('condition') && ! $this->filled('effects'))) {
                return;
            }

            $types = $this->project()->branchingVariables()->pluck('type', 'key');
            $condition = $this->input('condition');

            if (is_array($condition) && $condition !== []) {
                $this->checkOperation($validator, 'condition', $condition, $types->get($condition['var']), BranchingStateEvaluator::BOOL_CONDITION_OPS);
            }

            foreach (array_values((array) $this->input('effects', [])) as $index => $effect) {
                $this->checkOperation($validator, "effects.{$index}", $effect, $types->get($effect['var']), BranchingStateEvaluator::BOOL_EFFECT_OPS);
            }
        }];
    }

    private function checkOperation(Validator $validator, string $field, array $operation, ?string $type, array $boolOps): void
    {
        if ($type === null) {
            $validator->errors()->add("{$field}.var", __('The variable :var does not exist in this project.', ['var' => $operation['var']]));

            return;
        }

        $value = $operation['value'];
        $valid = $type === 'bool'
            ? in_array($operation['op'], $boolOps, true) && is_bool($value)
            : BranchingStateEvaluator::isNumber($value);

        if (! $valid) {
            $validator->errors()->add("{$field}.value", $type === 'bool'
                ? __('The variable :var is true/false: use :ops with true or false.', ['var' => $operation['var'], 'ops' => implode(' ', $boolOps)])
                : __('The variable :var is a number: the value must be a number.', ['var' => $operation['var']]));
        }
    }
}
