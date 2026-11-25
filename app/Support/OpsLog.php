<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Registro operativo en el canal `gamerdust` (storage/logs/gamerdust-AAAA-MM-DD.log).
 *
 * Solo admite una lista cerrada de claves con identificadores, códigos y tiempos: nunca la clave
 * de Groq, el prompt, la respuesta de la IA, el texto narrativo ni el mensaje de una excepción
 * (puede incluir SQL con contenido del guion).
 */
final class OpsLog
{
    /** Claves que se pueden registrar; el resto se descarta. */
    private const ALLOWED = [
        'project_id', 'user_id', 'type', 'model', 'attempt', 'reason', 'generation_id', 'latency_ms',
        'method', 'path', 'route', 'status', 'exception', 'at',
    ];

    /**
     * Fallo o degradación de la IA. `reason` es un código corto (http_429, timeout, invalid_json…).
     */
    public static function ai(string $event, array $context, string $level = 'warning'): void
    {
        self::write($level, 'ai.'.$event, $context);
    }

    /**
     * Respuesta 5xx: ruta, estado, usuario y clase de la excepción con su origen (archivo:línea).
     */
    public static function serverError(Request $request, Response $response, ?Throwable $exception): void
    {
        self::write($response->getStatusCode() >= 500 && $response->getStatusCode() !== 503 ? 'error' : 'warning', 'http.server_error', [
            'method' => $request->method(),
            // Solo la ruta (con ids), nunca la query ni el cuerpo.
            'path' => '/'.ltrim($request->path(), '/'),
            'route' => $request->route()?->getName(),
            'status' => $response->getStatusCode(),
            'user_id' => $request->user()?->id,
            'exception' => $exception ? $exception::class : null,
            'at' => $exception ? Str::after($exception->getFile(), base_path().DIRECTORY_SEPARATOR).':'.$exception->getLine() : null,
        ]);
    }

    private static function write(string $level, string $event, array $context): void
    {
        $clean = [];

        foreach (array_intersect_key($context, array_flip(self::ALLOWED)) as $key => $value) {
            if ($value === null || is_bool($value) || is_int($value) || is_float($value)) {
                $clean[$key] = $value;
            } elseif (is_string($value)) {
                $clean[$key] = Str::limit($value, 120, '…');
            }
        }

        try {
            Log::channel('gamerdust')->log($level, $event, $clean);
        } catch (Throwable) {
            // El registro nunca debe romper la petición (disco lleno, permisos…).
        }
    }
}
