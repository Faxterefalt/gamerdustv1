import { useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import type { Character } from '../../types/character';
import type { DialogueNode, DialogueOption, DialogueType } from '../../types/dialogue';
import type { Scene } from '../../types/scene';

interface DialogueNodeFormProps {
    projectId: number;
    dialogue?: DialogueNode;
    scenes: Pick<Scene, 'id' | 'title'>[];
    characters: Pick<Character, 'id' | 'name'>[];
    dialogues: Pick<DialogueNode, 'id' | 'node_key'>[];
    method?: 'post' | 'put';
    submitLabel: string;
}

interface DialogueOptionForm {
    player_option: string;
    next_dialogue_node_id: number | '';
    consequence: string;
    required_condition: string;
}

export default function DialogueNodeForm({ projectId, dialogue, scenes, characters, dialogues, method = 'post', submitLabel }: DialogueNodeFormProps) {
    const { data, setData, post, put, processing, errors } = useForm({
        scene_id: dialogue?.scene_id ?? '',
        character_id: dialogue?.character_id ?? '',
        node_key: dialogue?.node_key ?? '',
        dialogue_type: dialogue?.dialogue_type ?? 'ambient',
        text: dialogue?.text ?? '',
        emotional_tone: dialogue?.emotional_tone ?? '',
        trigger_condition: dialogue?.trigger_condition ?? '',
        options: normalizeOptions(dialogue?.options ?? []),
    });

    const action = dialogue ? `/projects/${projectId}/dialogues/${dialogue.id}` : `/projects/${projectId}/dialogues`;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        method === 'put' ? put(action) : post(action);
    };

    const updateOption = (index: number, key: keyof DialogueOptionForm, value: string | number) => {
        const options = [...data.options];
        options[index] = { ...options[index], [key]: value };
        setData('options', options);
    };

    const removeOption = (index: number) => {
        setData(
            'options',
            data.options.filter((_, current) => current !== index),
        );
    };

    return (
        <form onSubmit={submit} className="space-y-5 border border-zinc-800 bg-zinc-900 p-5">
            <div className="grid gap-4 md:grid-cols-3">
                <Field label="Clave del nodo" error={errors.node_key}>
                    <input value={data.node_key} onChange={(event) => setData('node_key', event.target.value)} className={inputClass} />
                </Field>
                <Field label="Tipo" error={errors.dialogue_type}>
                    <select value={data.dialogue_type} onChange={(event) => setData('dialogue_type', event.target.value as DialogueType)} className={inputClass}>
                        {['cutscene', 'ambient', 'bark', 'interactive_no_branch', 'interactive_rubber_banding', 'interactive_alternative_paths'].map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Tono emocional" error={errors.emotional_tone}>
                    <input value={data.emotional_tone} onChange={(event) => setData('emotional_tone', event.target.value)} className={inputClass} />
                </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Field label="Escena" error={errors.scene_id}>
                    <select value={data.scene_id} onChange={(event) => setData('scene_id', event.target.value ? Number(event.target.value) : '')} className={inputClass}>
                        <option value="">Sin escena</option>
                        {scenes.map((scene) => (
                            <option key={scene.id} value={scene.id}>
                                {scene.title}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Personaje" error={errors.character_id}>
                    <select value={data.character_id} onChange={(event) => setData('character_id', event.target.value ? Number(event.target.value) : '')} className={inputClass}>
                        <option value="">Sin personaje</option>
                        {characters.map((character) => (
                            <option key={character.id} value={character.id}>
                                {character.name}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>

            <Field label="Texto" error={errors.text}>
                <textarea value={data.text} onChange={(event) => setData('text', event.target.value)} rows={5} className={inputClass} />
            </Field>
            <Field label="Condicion de disparo" error={errors.trigger_condition}>
                <textarea value={data.trigger_condition} onChange={(event) => setData('trigger_condition', event.target.value)} rows={3} className={inputClass} />
            </Field>

            <section className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                    <h2 className="font-semibold text-white">Opciones del jugador</h2>
                    <button
                        type="button"
                        onClick={() => setData('options', [...data.options, { player_option: '', next_dialogue_node_id: '', consequence: '', required_condition: '' }])}
                        className="border border-zinc-700 px-3 py-2 text-sm hover:border-amber-500"
                    >
                        Agregar opcion
                    </button>
                </div>

                {data.options.map((option, index) => (
                    <div key={index} className="space-y-3 border border-zinc-800 bg-zinc-950 p-3">
                        <div className="flex justify-end">
                            <button type="button" onClick={() => removeOption(index)} className="text-sm text-rose-300 hover:text-rose-100">
                                Quitar
                            </button>
                        </div>
                        <Field label="Opcion" error={errors[`options.${index}.player_option`]}>
                            <input value={option.player_option} onChange={(event) => updateOption(index, 'player_option', event.target.value)} className={inputClass} />
                        </Field>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Siguiente nodo" error={errors[`options.${index}.next_dialogue_node_id`]}>
                                <select
                                    value={option.next_dialogue_node_id}
                                    onChange={(event) => updateOption(index, 'next_dialogue_node_id', event.target.value ? Number(event.target.value) : '')}
                                    className={inputClass}
                                >
                                    <option value="">Sin salto</option>
                                    {dialogues.map((node) => (
                                        <option key={node.id} value={node.id}>
                                            {node.node_key}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Condicion requerida" error={errors[`options.${index}.required_condition`]}>
                                <input value={option.required_condition} onChange={(event) => updateOption(index, 'required_condition', event.target.value)} className={inputClass} />
                            </Field>
                        </div>
                        <Field label="Consecuencia" error={errors[`options.${index}.consequence`]}>
                            <textarea value={option.consequence} onChange={(event) => updateOption(index, 'consequence', event.target.value)} rows={2} className={inputClass} />
                        </Field>
                    </div>
                ))}
            </section>

            <button type="submit" disabled={processing} className="border border-amber-600 px-4 py-2 text-sm text-amber-100 hover:bg-amber-950 disabled:opacity-50">
                {submitLabel}
            </button>
        </form>
    );
}

function normalizeOptions(options: DialogueOption[]): DialogueOptionForm[] {
    return options.map((option) => ({
        player_option: option.player_option,
        next_dialogue_node_id: option.next_dialogue_node_id ?? '',
        consequence: option.consequence ?? '',
        required_condition: option.required_condition ?? '',
    }));
}

const inputClass = 'w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500';

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">{label}</span>
            {children}
            {error && <span className="mt-1 block text-sm text-rose-300">{error}</span>}
        </label>
    );
}
