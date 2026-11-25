<?php

namespace App\Http\Requests\Branching;

class UpdateBranchingVariableRequest extends StoreBranchingVariableRequest
{
    public function rules(): array
    {
        return $this->variableRules(true);
    }
}
