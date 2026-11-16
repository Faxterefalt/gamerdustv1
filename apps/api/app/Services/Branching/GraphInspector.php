<?php

namespace App\Services\Branching;

use App\Models\DialogueNode;
use Illuminate\Support\Collection;

/**
 * Detecta problemas estructurales del grafo (solo lectura).
 */
class GraphInspector
{
    /**
     * @param  Collection<int, DialogueNode>  $nodes  con la relación options cargada
     * @return array{start_node_id: int|null, warnings: array<int, array{node_id: int, code: string, severity: string, message: string}>}
     */
    public function inspect(Collection $nodes): array
    {
        $startId = $nodes->min('id');
        $incoming = [];
        $outgoing = [];
        $warnings = [];

        foreach ($nodes as $node) {
            foreach ($node->options as $option) {
                if ($option->next_dialogue_node_id === null) {
                    $warnings[] = [
                        'node_id' => $node->id,
                        'code' => 'broken_option',
                        'severity' => 'error',
                        'message' => $option->isManaged()
                            ? __('The reference {{:option}} has no target; it will be recreated when the text is saved.', ['option' => $option->player_option])
                            : __('The option ":option" has no target.', ['option' => $option->player_option]),
                    ];

                    continue;
                }

                if ($option->next_dialogue_node_id !== $node->id) {
                    $outgoing[$node->id] = true;
                    $incoming[$option->next_dialogue_node_id] = true;
                }
            }
        }

        foreach ($nodes as $node) {
            $hasIn = isset($incoming[$node->id]);
            $hasOut = isset($outgoing[$node->id]);
            $isStart = $node->id === $startId;

            if (! $hasIn && ! $hasOut && $nodes->count() > 1) {
                $warnings[] = ['node_id' => $node->id, 'code' => 'isolated', 'severity' => 'warning', 'message' => __('Isolated node: no connections.')];
            } elseif (! $hasIn && ! $isStart) {
                $warnings[] = ['node_id' => $node->id, 'code' => 'no_incoming', 'severity' => 'info', 'message' => __('No node leads here.')];
            } elseif (! $hasOut) {
                $warnings[] = ['node_id' => $node->id, 'code' => 'no_outgoing', 'severity' => 'info', 'message' => __('No outgoing: the branch ends here.')];
            }
        }

        return ['start_node_id' => $startId, 'warnings' => $warnings];
    }
}
