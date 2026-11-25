<?php

namespace App\Services\Branching;

/**
 * Evaluador puro (sin BD) del estado de un recorrido: variables, condiciones y efectos (HU 19).
 *
 * Formato:
 * - condición: {var, op, value} con op en == != > >= < <= (bool solo admite == y !=);
 * - efectos: [{var, op: set|add|sub, value}] (bool solo admite set), aplicados en orden.
 *
 * Una condición sobre una variable desconocida es falsa; un efecto sobre una variable desconocida
 * o con un tipo que no le corresponde se ignora. Los números se redondean a 6 decimales.
 *
 * Su espejo en JavaScript está en resources/views/reports/partials/branching-state.blade.php
 * (modo Jugar de la exportación y "Probar recorrido"): cualquier cambio debe hacerse en ambos.
 */
final class BranchingStateEvaluator
{
    public const CONDITION_OPS = ['==', '!=', '>', '>=', '<', '<='];

    public const BOOL_CONDITION_OPS = ['==', '!='];

    public const EFFECT_OPS = ['set', 'add', 'sub'];

    public const BOOL_EFFECT_OPS = ['set'];

    /**
     * @param  iterable<array{key: string, type: string, initial_value: mixed}>  $variables
     * @return array<string, bool|int|float>
     */
    public function initialState(iterable $variables): array
    {
        $state = [];

        foreach ($variables as $variable) {
            $value = $this->coerce($variable['type'], $variable['initial_value']);

            if ($value !== null) {
                $state[$variable['key']] = $value;
            }
        }

        return $state;
    }

    /**
     * @param  array{var?: string, op?: string, value?: mixed}|null  $condition
     * @param  array<string, bool|int|float>  $state
     */
    public function isAvailable(?array $condition, array $state): bool
    {
        if (! $condition) {
            return true;
        }

        $key = $condition['var'] ?? null;
        $op = $condition['op'] ?? null;
        $expected = $condition['value'] ?? null;

        if (! is_string($key) || ! array_key_exists($key, $state)) {
            return false;
        }

        $current = $state[$key];

        if (is_bool($current)) {
            return is_bool($expected) && match ($op) {
                '==' => $current === $expected,
                '!=' => $current !== $expected,
                default => false,
            };
        }

        if (! self::isNumber($expected)) {
            return false;
        }

        $a = self::round($current);
        $b = self::round($expected);

        return match ($op) {
            '==' => $a == $b,
            '!=' => $a != $b,
            '>' => $a > $b,
            '>=' => $a >= $b,
            '<' => $a < $b,
            '<=' => $a <= $b,
            default => false,
        };
    }

    /**
     * Devuelve un estado nuevo con los efectos aplicados (no modifica el recibido).
     *
     * @param  array<int, array{var?: string, op?: string, value?: mixed}>|null  $effects
     * @param  array<string, bool|int|float>  $state
     * @return array<string, bool|int|float>
     */
    public function apply(?array $effects, array $state): array
    {
        foreach ($effects ?? [] as $effect) {
            $key = $effect['var'] ?? null;
            $value = $effect['value'] ?? null;

            if (! is_string($key) || ! array_key_exists($key, $state)) {
                continue;
            }

            $current = $state[$key];

            if (is_bool($current)) {
                if (($effect['op'] ?? null) === 'set' && is_bool($value)) {
                    $state[$key] = $value;
                }

                continue;
            }

            if (! self::isNumber($value)) {
                continue;
            }

            $state[$key] = match ($effect['op'] ?? null) {
                'set' => self::round($value),
                'add' => self::round($current + $value),
                'sub' => self::round($current - $value),
                default => $current,
            };
        }

        return $state;
    }

    /** Valor inicial con el tipo de la variable, o null si no encaja. */
    public function coerce(string $type, mixed $value): bool|int|float|null
    {
        return match ($type) {
            'bool' => is_bool($value) ? $value : null,
            'number' => self::isNumber($value) ? self::round($value) : null,
            default => null,
        };
    }

    public static function isNumber(mixed $value): bool
    {
        return (is_int($value) || is_float($value)) && is_finite((float) $value);
    }

    private static function round(int|float $value): int|float
    {
        $rounded = round((float) $value, 6);

        return floor($rounded) === $rounded && abs($rounded) < PHP_INT_MAX ? (int) $rounded : $rounded;
    }
}
