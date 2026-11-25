<?php

namespace App\Services\Branching;

use App\Models\DialogueNode;
use Illuminate\Support\Collection;

/**
 * Detecta problemas estructurales del grafo (solo lectura).
 *
 * Inicio: el nodo marcado con `is_start`; si no hay ninguno, el de menor id (respaldo).
 * Cada nodo recibe como mucho un aviso estructural, por prioridad:
 * isolated > no_incoming > unreachable > no_outgoing. `unreachable` se calcula con un BFS desde el
 * inicio por las opciones con destino, así que los ciclos alcanzables no generan aviso y un ciclo
 * aislado del inicio sí. `no_outgoing` no aplica a los finales declarados (`is_ending`).
 */
class GraphInspector
{
    /**
     * @param  Collection<int, DialogueNode>  $nodes  con la relación options cargada
     * @return array{start_node_id: int|null, warnings: array<int, array{node_id: int, code: string, severity: string, message: string}>}
     */
    public function inspect(Collection $nodes): array
    {
        $startId = $nodes->firstWhere('is_start', true)?->id ?? $nodes->min('id');
        $incoming = [];
        $outgoing = [];
        $adjacency = [];
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

                $adjacency[$node->id][] = $option->next_dialogue_node_id;

                if ($option->next_dialogue_node_id !== $node->id) {
                    $outgoing[$node->id] = true;
                    $incoming[$option->next_dialogue_node_id] = true;
                }
            }
        }

        $reachable = $this->reachable($startId, $adjacency);

        foreach ($nodes as $node) {
            $hasIn = isset($incoming[$node->id]);
            $hasOut = isset($outgoing[$node->id]);
            $isStart = $node->id === $startId;

            if (! $hasIn && ! $hasOut && $nodes->count() > 1) {
                $warnings[] = ['node_id' => $node->id, 'code' => 'isolated', 'severity' => 'warning', 'message' => __('Isolated node: no connections.')];
            } elseif (! $hasIn && ! $isStart) {
                $warnings[] = ['node_id' => $node->id, 'code' => 'no_incoming', 'severity' => 'info', 'message' => __('No node leads here.')];
            } elseif (! isset($reachable[$node->id])) {
                $warnings[] = ['node_id' => $node->id, 'code' => 'unreachable', 'severity' => 'warning', 'message' => __('Unreachable: no path leads here from the start node.')];
            } elseif (! $hasOut && ! $node->is_ending) {
                $warnings[] = ['node_id' => $node->id, 'code' => 'no_outgoing', 'severity' => 'info', 'message' => __('No outgoing: the branch ends here.')];
            }
        }

        return ['start_node_id' => $startId, 'warnings' => $warnings];
    }

    /**
     * @param  array<int, array<int, int>>  $adjacency
     * @return array<int, true>
     */
    private function reachable(?int $startId, array $adjacency): array
    {
        if ($startId === null) {
            return [];
        }

        $seen = [$startId => true];
        $queue = [$startId];

        while ($queue) {
            foreach ($adjacency[array_shift($queue)] ?? [] as $next) {
                if (! isset($seen[$next])) {
                    $seen[$next] = true;
                    $queue[] = $next;
                }
            }
        }

        return $seen;
    }
}
