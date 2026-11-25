<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Aplica el idioma elegido por el usuario (cookie "locale"); si no hay elección válida se usa config('app.locale').
 */
class SetLocale
{
    public const COOKIE = 'locale';

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->cookie(self::COOKIE);

        if (is_string($locale) && in_array($locale, config('app.supported_locales'), true)) {
            app()->setLocale($locale);
        }

        return $next($request);
    }
}
