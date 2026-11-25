<?php

namespace App\Http\Requests\Branching;

use Illuminate\Validation\Rule;

class UpdateNodePositionsRequest extends BranchingRequest
{
    public function rules(): array
    {
        return [
            'positions' => ['required', 'array', 'min:1', 'max:500'],
            'positions.*.id' => ['required', 'integer', Rule::exists('dialogue_nodes', 'id')->where('project_id', $this->project()->id)],
            'positions.*.x' => ['required', 'numeric', 'between:-1000000,1000000'],
            'positions.*.y' => ['required', 'numeric', 'between:-1000000,1000000'],
        ];
    }
}
