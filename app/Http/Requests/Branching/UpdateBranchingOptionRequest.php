<?php

namespace App\Http\Requests\Branching;

class UpdateBranchingOptionRequest extends BranchingRequest
{
    public function rules(): array
    {
        return $this->optionRules(true);
    }
}
