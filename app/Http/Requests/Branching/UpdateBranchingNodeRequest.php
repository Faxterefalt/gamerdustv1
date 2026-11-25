<?php

namespace App\Http\Requests\Branching;

class UpdateBranchingNodeRequest extends BranchingRequest
{
    public function rules(): array
    {
        return ['title' => ['sometimes', 'required', 'string', 'max:255'], ...$this->nodeFieldRules(true)];
    }
}
