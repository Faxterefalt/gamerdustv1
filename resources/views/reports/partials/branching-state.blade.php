{{-- Espejo en JavaScript de App\Services\Branching\BranchingStateEvaluator (mismas reglas). Cualquier cambio, en ambos. --}}
<script>
    var BranchingState = (function () {
        'use strict';

        var BOOL_CONDITION_OPS = ['==', '!='];

        function isNumber(value) { return typeof value === 'number' && isFinite(value); }

        // round(x, 6) de PHP: redondeo "half away from zero".
        function round(value) {
            var sign = value < 0 ? -1 : 1;
            return sign * Math.round(Math.abs(value) * 1e6) / 1e6;
        }

        function has(state, key) { return typeof key === 'string' && Object.prototype.hasOwnProperty.call(state, key); }

        function coerce(type, value) {
            if (type === 'bool') { return typeof value === 'boolean' ? value : null; }
            if (type === 'number') { return isNumber(value) ? round(value) : null; }
            return null;
        }

        function initialState(variables) {
            var state = {};
            (variables || []).forEach(function (variable) {
                var value = coerce(variable.type, variable.initial_value);
                if (value !== null) { state[variable.key] = value; }
            });
            return state;
        }

        function isAvailable(condition, state) {
            if (!condition || !Object.keys(condition).length) { return true; }
            if (!has(state, condition.var)) { return false; }
            var current = state[condition.var], expected = condition.value;
            if (typeof current === 'boolean') {
                if (typeof expected !== 'boolean' || BOOL_CONDITION_OPS.indexOf(condition.op) === -1) { return false; }
                return condition.op === '==' ? current === expected : current !== expected;
            }
            if (!isNumber(expected)) { return false; }
            var a = round(current), b = round(expected);
            switch (condition.op) {
                case '==': return a === b;
                case '!=': return a !== b;
                case '>': return a > b;
                case '>=': return a >= b;
                case '<': return a < b;
                case '<=': return a <= b;
                default: return false;
            }
        }

        // Devuelve un estado nuevo: el recibido no se modifica.
        function apply(effects, state) {
            var next = {};
            Object.keys(state).forEach(function (key) { next[key] = state[key]; });
            (effects || []).forEach(function (effect) {
                if (!has(next, effect.var)) { return; }
                var current = next[effect.var], value = effect.value;
                if (typeof current === 'boolean') {
                    if (effect.op === 'set' && typeof value === 'boolean') { next[effect.var] = value; }
                    return;
                }
                if (!isNumber(value)) { return; }
                if (effect.op === 'set') { next[effect.var] = round(value); }
                else if (effect.op === 'add') { next[effect.var] = round(current + value); }
                else if (effect.op === 'sub') { next[effect.var] = round(current - value); }
            });
            return next;
        }

        return { initialState: initialState, isAvailable: isAvailable, apply: apply };
    })();
</script>
