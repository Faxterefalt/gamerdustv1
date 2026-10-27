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
                            ? "La referencia {{{$option->player_option}}} no tiene destino; se recreara al guardar el texto."
                            : "La opcion \"{$option->player_option}\" no tiene destino.",
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
                $warnings[] = ['node_id' => $node->id, 'code' => 'isolated', 'severity' => 'warning', 'message' => 'Nodo aislado: sin conexiones.'];
            } elseif (! $hasIn && ! $isStart) {
                $warnings[] = ['node_id' => $node->id, 'code' => 'no_incoming', 'severity' => 'info', 'message' => 'Ningun nodo lleva hasta aqui.'];
            } elseif (! $hasOut) {
                $warnings[] = ['node_id' => $node->id, 'code' => 'no_outgoing', 'severity' => 'info', 'message' => 'Sin salida: la rama termina aqui.'];
            }
        }

        return ['start_node_id' => $startId, 'warnings' => $warnings];
    }
}
