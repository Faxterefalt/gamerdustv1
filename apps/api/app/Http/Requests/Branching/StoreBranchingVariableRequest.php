<?php

namespace App\Http\Requests\Branching;

use App\Models\BranchingVariable;
use App\Services\Branching\BranchingStateEvaluator;
use Closure;
use Illuminate\Validation\Rule;

class StoreBranchingVariableRequest extends BranchingRequest
{
    public function rules(): array
    {
        return $this->variableRules(false);
    }

    protected function variableRules(bool $partial): array
    {
        $prefix = $partial ? ['sometimes'] : [];
        $variable = $this->route('variable');

        return [
            // Letras, números y guion bajo, sin empezar por número: así se lee igual en condiciones y efectos.
            'key' => [...$prefix, 'required', 'string', 'max:64', 'regex:/^[\p{L}_][\p{L}\p{N}_]*$/u',
                Rule::unique('branching_variables', 'key')->where('project_id', $this->project()->id)->ignore($variable instanceof BranchingVariable ? $variable->id : null)],
            'type' => [...$prefix, 'required', Rule::in(BranchingVariable::TYPES)],
            'initial_value' => [...$prefix, 'present', function (string $attribute, mixed $value, Closure $fail): void {
                $type = $this->input('type', $this->route('variable')?->type);

                if (app(BranchingStateEvaluator::class)->coerce((string) $type, $value) === null) {
                    $fail($type === 'bool' ? __('The initial value must be true or false.') : __('The initial value must be a number.'));
                }
            }],
            'description' => [...$prefix, 'nullable', 'string', 'max:500'],
        ];
    }
}
