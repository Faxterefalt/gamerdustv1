<?php

namespace App\Http\Middleware;

use App\Support\OpsLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Deja constancia en el canal `gamerdust` de cada respuesta 5xx (excepciones no controladas,
 * aborts 5xx y la IA no disponible). Laravel ya ha convertido la excepción en respuesta aquí.
 */
class LogServerErrors
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($response->getStatusCode() >= 500) {
            OpsLog::serverError($request, $response, property_exists($response, 'exception') ? $response->exception : null);
        }

        return $response;
    }
}
