<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\LogServerErrors;
use App\Http\Middleware\SetLocale;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Confía en el túnel o proxy que termina TLS (Cloudflare Tunnel): sin esto Laravel
        // ve la petición como http y genera URLs, redirecciones y assets sin https.
        $middleware->trustProxies(at: '*');

        // Global: registra cualquier 5xx en el canal gamerdust (HU 59).
        $middleware->append(LogServerErrors::class);

        $middleware->web(append: [
            SetLocale::class,
            HandleInertiaRequests::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*')
                || ($request->is('projects/*/branching/*', 'projects/*/script/*', 'projects/*/analysis/*', 'projects/*/ai/*', 'projects/*/locks', 'projects/*/locks/*') && $request->wantsJson()),
        );
    })->create();
