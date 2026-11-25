import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { __ } from '../../../shared/lib/i18n';
import type { BranchingVariable, ConditionOp, EffectOp, GraphOption, OptionCondition, OptionEffect, OptionPatch, VariableValue } from '../branching.types';
import { iconButton, secondary } from '../../../shared/lib/styles';

interface OptionLogicEditorProps {
    option: GraphOption;
    variables: BranchingVariable[];
    /** Los cambios estructurados se guardan al momento (no hay texto a medio escribir). */
    onChange: (patch: OptionPatch) => void;
    onOpenVariables: () => void;
}

const CONDITION_OPS: Record<BranchingVariable['type'], ConditionOp[]> = {
    bool: ['==', '!='],
    number: ['==', '!=', '>', '>=', '<', '<='],
};

const EFFECT_OPS: Record<BranchingVariable['type'], EffectOp[]> = { bool: ['set'], number: ['set', 'add', 'sub'] };

const EFFECT_LABEL: Record<EffectOp, string> = { set: '=', add: '+', sub: '−' };

const select = 'nodrag nowheel border border-border-strong bg-background px-1.5 py-1 text-xs text-foreground focus:border-primary';

/** Valor por defecto al elegir una variable: no altera nada hasta que el autor lo cambie. */
function defaults(variable: BranchingVariable): { op: ConditionOp; effect: EffectOp; value: VariableValue } {
    return variable.type === 'bool' ? { op: '==', effect: 'set', value: true } : { op: '>=', effect: 'add', value: 1 };
}

/**
 * Condición ({var, op, value}) y efectos ([{var, op, value}]) de una opción. Se evalúan en "Probar recorrido"
 * y en la exportación HTML; el servidor valida el tipo de cada operación.
 */
export default function OptionLogicEditor({ option, variables, onChange, onOpenVariables }: OptionLogicEditorProps) {
    const byKey = new Map(variables.map((variable) => [variable.key, variable]));
    const condition = option.condition;
    const effects = option.effects ?? [];

    if (!variables.length) {
        return (
            <p className="text-xs text-subtle">
                {__('Create variables to add conditions and effects.')}{' '}
                <button type="button" onClick={onOpenVariables} className="text-primary underline hover:text-foreground">
                    {__('Variables')}
                </button>
            </p>
        );
    }

    const setCondition = (next: OptionCondition | null) => onChange({ condition: next });
    const setEffects = (next: OptionEffect[]) => onChange({ effects: next });

    return (
        <div className="space-y-2 text-xs text-muted">
            <div>
                <span className="mb-1 block">{__('Available if')}</span>
                <div className="flex flex-wrap items-center gap-1.5">
                    <select
                        aria-label={__('Condition variable')}
                        className={select}
                        value={condition?.var ?? ''}
                        onChange={(event) => {
                            const variable = byKey.get(event.target.value);
                            setCondition(variable ? { var: variable.key, op: defaults(variable).op, value: defaults(variable).value } : null);
                        }}
                    >
                        <option value="">{__('(always)')}</option>
                        {variables.map((variable) => (
                            <option key={variable.id} value={variable.key}>
                                {variable.key}
                            </option>
                        ))}
                    </select>
                    {condition && byKey.get(condition.var) && (
                        <>
                            <select aria-label={__('Operator')} className={select} value={condition.op} onChange={(event) => setCondition({ ...condition, op: event.target.value as ConditionOp })}>
                                {CONDITION_OPS[byKey.get(condition.var)!.type].map((op) => (
                                    <option key={op} value={op}>
                                        {op}
                                    </option>
                                ))}
                            </select>
                            <ValueInput variable={byKey.get(condition.var)!} value={condition.value} onChange={(value) => setCondition({ ...condition, value })} />
                        </>
                    )}
                    {condition && !byKey.get(condition.var) && <span className="text-danger">{__('Unknown variable: :var', { var: condition.var })}</span>}
                </div>
            </div>

            <div>
                <span className="mb-1 block">{__('Effects when chosen')}</span>
                <div className="space-y-1.5">
                    {effects.map((effect, index) => {
                        const variable = byKey.get(effect.var);
                        const replace = (next: OptionEffect) => setEffects(effects.map((item, position) => (position === index ? next : item)));

                        return (
                            <div key={index} className="flex flex-wrap items-center gap-1.5">
                                <select
                                    aria-label={__('Effect variable')}
                                    className={select}
                                    value={effect.var}
                                    onChange={(event) => {
                                        const chosen = byKey.get(event.target.value)!;
                                        replace({ var: chosen.key, op: defaults(chosen).effect, value: defaults(chosen).value });
                                    }}
                                >
                                    {!variable && <option value={effect.var}>{effect.var}</option>}
                                    {variables.map((candidate) => (
                                        <option key={candidate.id} value={candidate.key}>
                                            {candidate.key}
                                        </option>
                                    ))}
                                </select>
                                {variable && (
                                    <>
                                        <select aria-label={__('Operation')} className={select} value={effect.op} onChange={(event) => replace({ ...effect, op: event.target.value as EffectOp })}>
                                            {EFFECT_OPS[variable.type].map((op) => (
                                                <option key={op} value={op}>
                                                    {EFFECT_LABEL[op]}
                                                </option>
                                            ))}
                                        </select>
                                        <ValueInput variable={variable} value={effect.value} onChange={(value) => replace({ ...effect, value })} />
                                    </>
                                )}
                                <button
                                    type="button"
                                    aria-label={__('Remove effect')}
                                    onClick={() => setEffects(effects.filter((_, position) => position !== index))}
                                    className={`${iconButton} hover:text-danger`}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        );
                    })}
                    <button
                        type="button"
                        onClick={() => {
                            const first = variables[0];
                            setEffects([...effects, { var: first.key, op: defaults(first).effect, value: defaults(first).value }]);
                        }}
                        className={secondary}
                    >
                        <Plus size={11} /> {__('Effect')}
                    </button>
                </div>
            </div>
        </div>
    );
}

/** Verdadero/falso con un selector; números con un campo que solo avisa al cambiar a un número válido. */
export function ValueInput({ variable, value, onChange }: { variable: Pick<BranchingVariable, 'type'>; value: VariableValue; onChange: (value: VariableValue) => void }) {
    const [text, setText] = useState(String(value));

    useEffect(() => setText(String(value)), [value]);

    if (variable.type === 'bool') {
        return (
            <select aria-label={__('Value')} className={select} value={value ? 'true' : 'false'} onChange={(event) => onChange(event.target.value === 'true')}>
                <option value="true">{__('true')}</option>
                <option value="false">{__('false')}</option>
            </select>
        );
    }

    return (
        <input
            aria-label={__('Value')}
            type="number"
            step="any"
            className={`${select} w-20`}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onBlur={() => {
                const parsed = Number(text);

                if (text.trim() !== '' && Number.isFinite(parsed) && parsed !== value) {
                    onChange(parsed);
                } else {
                    setText(String(value));
                }
            }}
        />
    );
}
