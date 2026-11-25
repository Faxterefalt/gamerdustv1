<?php

namespace App\Http\Requests\Branching;

class StoreBranchingOptionRequest extends BranchingRequest
{
    public function rules(): array
    {
        return $this->optionRules(false);
    }
}
