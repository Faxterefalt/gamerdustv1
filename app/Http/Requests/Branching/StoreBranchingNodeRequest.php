<?php

namespace App\Http\Requests\Branching;

class StoreBranchingNodeRequest extends BranchingRequest
{
    public function rules(): array
    {
        return ['title' => ['required', 'string', 'max:255'], ...$this->nodeFieldRules(false)];
    }
}
