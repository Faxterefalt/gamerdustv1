<?php

namespace App\Services\Branching;

use App\Models\DialogueNode;
use App\Models\DialogueOption;
use App\Models\Project;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BranchingNodeService
{
    private const NODE_FIELDS = ['scene_id', 'character_id', 'dialogue_type', 'text', 'emotional_tone', 'trigger_condition', 'pos_x', 'pos_y'];

    public function __construct(
        private readonly ReferenceSyncService $references,
        private readonly ReferenceParser $parser,
    ) {}

    /**
     * @return array{node: DialogueNode, sync: array}
     */
    public function create(Project $project, array $data): array
    {
        return DB::transaction(function () use ($project, $data): array {
            $attributes = Arr::only($data, self::NODE_FIELDS);
            $attributes['text'] = $attributes['text'] ?? '';
            $attributes = array_filter($attributes, fn ($value, $key) => $key === 'text' || $value !== null, ARRAY_FILTER_USE_BOTH);

            $node = $this->references->createNode($project->id, $data['title'], $attributes);

            return ['node' => $node, 'sync' => $this->references->sync($node)];
        });
    }

    /**
     * @return array{node: DialogueNode, sync: array, renamed: array<int, array{id: int, title: string}>}
     */
    public function update(DialogueNode $node, array $data): array
    {
        return DB::transaction(function () use ($node, $data): array {
            Project::whereKey($node->project_id)->lockForUpdate()->first();
            $node->refresh();

            $attributes = Arr::only($data, self::NODE_FIELDS);
            $renamed = [];
            $titleChanged = false;

            if (array_key_exists('title', $data)) {
                $newTitle = $this->parser->clean((string) $data['title']);

                if ($newTitle !== $node->displayTitle()) {
                    $oldKey = $this->parser->normalize($node->displayTitle());
                    $renamed = $this->references->renameTitle($node, $newTitle);
                    $titleChanged = true;

                    if (isset($attributes['text'])) {
                        $attributes['text'] = $this->parser->replace($attributes['text'], $oldKey, $newTitle);
                    }
                }
            }

            if (array_key_exists('text', $attributes)) {
                $attributes['text'] = $attributes['text'] ?? '';
            }

            $node->fill($attributes)->save();

            $sync = ['created_nodes' => [], 'created_options' => 0, 'updated_options' => 0, 'removed_options' => []];

            if (array_key_exists('text', $attributes) || $titleChanged) {
                $sync = $this->references->sync($node);
            }

            return ['node' => $node, 'sync' => $sync, 'renamed' => $renamed];
        });
    }

    /**
     * Las opciones entrantes se conservan sin destino (rotas); no se toca ningún texto.
     *
     * @return array<int, array{option_id: int, source_node_id: int, source_title: string, player_option: string, managed: bool}>
     */
    public function delete(DialogueNode $node): array
    {
        return DB::transaction(function () use ($node): array {
            Project::whereKey($node->project_id)->lockForUpdate()->first();

            $incoming = $node->incomingOptions()->with('dialogueNode:id,node_key,title')->get();

            $affected = $incoming
                ->reject(fn (DialogueOption $option) => $option->dialogue_node_id === $node->id)
                ->map(fn (DialogueOption $option) => [
                    'option_id' => $option->id,
                    'source_node_id' => $option->dialogue_node_id,
                    'source_title' => $option->dialogueNode->displayTitle(),
                    'player_option' => $option->player_option,
                    'managed' => $option->isManaged(),
                ])
                ->values()
                ->all();

            $node->incomingOptions()->update(['next_dialogue_node_id' => null]);
            $node->options()->delete();
            $node->delete();

            return $affected;
        });
    }

    /**
     * @param  array<int, array{id: int, x: float|int, y: float|int}>  $positions
     */
    public function savePositions(Project $project, array $positions): int
    {
        return DB::transaction(function () use ($project, $positions): int {
            $count = 0;

            foreach ($positions as $position) {
                $count += DialogueNode::where('project_id', $project->id)
                    ->whereKey($position['id'])
                    ->update(['pos_x' => $position['x'], 'pos_y' => $position['y']]);
            }

            return $count;
        });
    }

    public function createOption(DialogueNode $node, array $data): DialogueOption
    {
        return $node->options()->create(Arr::only($data, ['player_option', 'next_dialogue_node_id', 'consequence', 'required_condition']));
    }

    public function updateOption(DialogueOption $option, array $data): DialogueOption
    {
        $attributes = Arr::only($data, ['player_option', 'next_dialogue_node_id', 'consequence', 'required_condition']);

        if ($option->isManaged()) {
            $locked = collect(['player_option', 'next_dialogue_node_id'])
                ->filter(fn (string $field) => array_key_exists($field, $attributes) && $attributes[$field] != $option->{$field});

            if ($locked->isNotEmpty()) {
                throw ValidationException::withMessages([
                    $locked->first() => __('This option is managed by a {{ }} reference in the text; edit the node text to change it.'),
                ]);
            }

            unset($attributes['player_option'], $attributes['next_dialogue_node_id']);
        }

        $option->update($attributes);

        return $option;
    }

    public function deleteOption(DialogueOption $option): void
    {
        if ($option->isManaged()) {
            throw ValidationException::withMessages([
                'option' => __('This option is managed by a {{ }} reference; remove the reference from the text to delete it.'),
            ]);
        }

        $option->delete();
    }
}
