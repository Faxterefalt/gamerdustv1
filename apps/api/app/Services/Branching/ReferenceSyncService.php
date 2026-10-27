<?php

namespace App\Services\Branching;

use App\Models\DialogueNode;
use App\Models\DialogueOption;
use App\Models\Project;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Mantiene sincronizadas las referencias {{Título}} del texto con las filas de dialogue_options.
 * Solo toca opciones con source_ref (administradas); las manuales nunca se modifican.
 */
class ReferenceSyncService
{
    public function __construct(private readonly ReferenceParser $parser)
    {
    }

    /**
     * @return array{created_nodes: array<int, array{id: int, title: string}>, created_options: int, updated_options: int, removed_options: array<int, array{id: int, player_option: string}>}
     */
    public function sync(DialogueNode $node): array
    {
        return DB::transaction(function () use ($node): array {
            $this->lockProject($node->project_id);

            $index = $this->titleIndex($node->project_id);
            $existing = $node->options()->whereNotNull('source_ref')->get()->keyBy('source_ref');
            $result = ['created_nodes' => [], 'created_options' => 0, 'updated_options' => 0, 'removed_options' => []];
            $wanted = [];

            foreach ($this->parser->extract($node->text) as $reference) {
                $wanted[] = $reference['key'];
                $target = $index[$reference['key']] ?? null;

                if ($target === null) {
                    $target = $this->createNode($node->project_id, $reference['label'], $this->placementNear($node, count($result['created_nodes'])));
                    $index[$reference['key']] = $target;
                    $result['created_nodes'][] = ['id' => $target->id, 'title' => $target->displayTitle()];
                }

                $option = $existing->get($reference['key']);

                if ($option === null) {
                    $node->options()->create([
                        'next_dialogue_node_id' => $target->id,
                        'player_option' => $reference['label'],
                        'source_ref' => $reference['key'],
                    ]);
                    $result['created_options']++;

                    continue;
                }

                $option->fill(['next_dialogue_node_id' => $target->id, 'player_option' => $reference['label']]);

                if ($option->isDirty()) {
                    $option->save();
                    $result['updated_options']++;
                }
            }

            foreach ($existing as $option) {
                if (! in_array($option->source_ref, $wanted, true)) {
                    $result['removed_options'][] = ['id' => $option->id, 'player_option' => $option->player_option];
                    $option->delete();
                }
            }

            return $result;
        });
    }

    /**
     * Cambia el título conservando id y node_key, y actualiza {{Antiguo}} -> {{Nuevo}} en los textos del proyecto.
     *
     * @return array<int, array{id: int, title: string}> nodos origen cuyo texto fue reescrito
     */
    public function renameTitle(DialogueNode $node, string $newTitle): array
    {
        $newTitle = $this->parser->clean($newTitle);

        return DB::transaction(function () use ($node, $newTitle): array {
            $this->lockProject($node->project_id);
            $this->assertTitleAvailable($node->project_id, $newTitle, $node->id);

            $oldTitle = $node->displayTitle();

            if ($oldTitle === $newTitle) {
                return [];
            }

            $oldKey = $this->parser->normalize($oldTitle);
            $newKey = $this->parser->normalize($newTitle);

            $node->title = $newTitle;
            $node->save();

            $incoming = DialogueOption::where('next_dialogue_node_id', $node->id)->whereNotNull('source_ref')->get();

            foreach ($incoming as $option) {
                DialogueOption::where('dialogue_node_id', $option->dialogue_node_id)
                    ->where('source_ref', $newKey)
                    ->whereKeyNot($option->id)
                    ->whereNull('next_dialogue_node_id')
                    ->delete();

                $option->update(['source_ref' => $newKey, 'player_option' => $newTitle]);
            }

            $affected = [];

            $candidates = DialogueNode::where('project_id', $node->project_id)->where('text', 'like', '%{{%')->get();

            foreach ($candidates as $candidate) {
                $hasReference = collect($this->parser->extract($candidate->text))
                    ->contains(fn (array $reference) => $reference['key'] === $oldKey);

                if (! $hasReference) {
                    continue;
                }

                $candidate->text = $this->parser->replace($candidate->text, $oldKey, $newTitle);
                $candidate->save();

                if ($candidate->id === $node->id) {
                    $node->text = $candidate->text;
                }

                $affected[] = $candidate;
            }

            foreach ($affected as $candidate) {
                $this->sync($candidate);
            }

            return collect($affected)->map(fn (DialogueNode $n) => ['id' => $n->id, 'title' => $n->displayTitle()])->all();
        });
    }

    public function createNode(int $projectId, string $title, array $attributes = []): DialogueNode
    {
        $title = $this->parser->clean($title);

        return DB::transaction(function () use ($projectId, $title, $attributes): DialogueNode {
            $this->lockProject($projectId);
            $this->assertTitleAvailable($projectId, $title);

            return DialogueNode::create([
                'text' => '',
                'dialogue_type' => 'ambient',
                ...$attributes,
                'project_id' => $projectId,
                'title' => $title,
                'node_key' => $this->uniqueNodeKey($projectId, $title),
            ]);
        });
    }

    public function assertTitleAvailable(int $projectId, string $title, ?int $exceptId = null): void
    {
        $key = $this->parser->normalize($title);

        $taken = DialogueNode::where('project_id', $projectId)
            ->when($exceptId, fn ($query) => $query->whereKeyNot($exceptId))
            ->get(['id', 'node_key', 'title'])
            ->contains(fn (DialogueNode $other) => $this->parser->normalize($other->displayTitle()) === $key);

        if ($taken) {
            throw ValidationException::withMessages(['title' => "Ya existe un pasaje llamado \"{$title}\" en este proyecto."]);
        }
    }

    /**
     * @return array<string, DialogueNode> clave normalizada del título efectivo => nodo (gana el de menor id)
     */
    private function titleIndex(int $projectId): array
    {
        $index = [];

        foreach (DialogueNode::where('project_id', $projectId)->orderBy('id')->get() as $node) {
            $index[$this->parser->normalize($node->displayTitle())] ??= $node;
        }

        return $index;
    }

    private function uniqueNodeKey(int $projectId, string $title): string
    {
        $base = Str::limit(Str::slug($title, '_'), 200, '') ?: 'passage';
        $used = DialogueNode::where('project_id', $projectId)->where('node_key', 'like', $base.'%')->pluck('node_key')->all();

        $key = $base;
        $suffix = 2;

        while (in_array($key, $used, true)) {
            $key = $base.'_'.$suffix++;
        }

        return $key;
    }

    private function placementNear(DialogueNode $source, int $offset): array
    {
        $attributes = ['scene_id' => $source->scene_id];

        if ($source->pos_x !== null && $source->pos_y !== null) {
            $attributes['pos_x'] = $source->pos_x + 340;
            $attributes['pos_y'] = $source->pos_y + ($offset * 170);
        }

        return $attributes;
    }

    private function lockProject(int $projectId): void
    {
        Project::whereKey($projectId)->lockForUpdate()->first();
    }
}
