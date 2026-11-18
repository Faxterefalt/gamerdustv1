<?php

namespace App\Http\Controllers;

use App\Http\Requests\EditLockRequest;
use App\Models\Project;
use App\Services\Collaboration\EditLockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * Bloqueo blando de escenas y nodos (HU 26, endpoints JSON). Informa, no impide guardar.
 */
class EditLockController extends Controller
{
    public function __construct(private readonly EditLockService $locks) {}

    public function heartbeat(EditLockRequest $request, Project $project): JsonResponse
    {
        return response()->json($this->locks->heartbeat($project, $request->lockable(), $request->user()));
    }

    public function release(EditLockRequest $request, Project $project): Response
    {
        $this->locks->release($request->lockable(), $request->user());

        return response()->noContent();
    }
}
