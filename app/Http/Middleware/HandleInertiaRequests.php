<?php

namespace App\Http\Middleware;

use App\Models\Project;
use App\Models\ProjectMember;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user()?->only('id', 'name', 'email'),
            ],
            'locale' => fn () => app()->getLocale(),
            // Rol del usuario en el proyecto de la ruta (la interfaz oculta lo que no puede hacer).
            'projectAccess' => function () use ($request) {
                $project = $request->route('project');

                if (! $project instanceof Project || ! $request->user()) {
                    return null;
                }

                $role = $project->roleFor($request->user());

                return [
                    'role' => $role,
                    'can_update' => in_array($role, ProjectMember::WRITERS, true),
                    'can_manage' => in_array($role, ProjectMember::MANAGERS, true),
                    'is_owner' => $role === 'owner',
                ];
            },
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}
