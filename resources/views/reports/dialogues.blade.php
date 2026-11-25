@php
    // Textos de la interfaz del archivo exportado (se traducen al idioma activo al exportar).
    $texts = [
        'map' => __('Map'),
        'play' => __('Play'),
        'zoomIn' => __('Zoom in'),
        'zoomOut' => __('Zoom out'),
        'fit' => __('Fit to screen'),
        'start' => __('Start'),
        'startNode' => __('Start node'),
        'playFromHere' => __('Play from here'),
        'viewOnMap' => __('View on map'),
        'restart' => __('Restart'),
        'back' => __('Back'),
        'options' => __('Options'),
        'character' => __('Character'),
        'scene' => __('Scene'),
        'tone' => __('Emotional tone'),
        'trigger' => __('Trigger condition'),
        'warnings' => __('Warnings'),
        'path' => __('Path'),
        'noTarget' => __('No target'),
        'requires' => __('Requires: :condition'),
        'consequence' => __('Consequence: :consequence'),
        'end' => __('End of this branch.'),
        'empty' => __('This project has no dialogues yet.'),
        'selectHint' => __('Select a node to see its details.'),
        'mapHint' => __('Drag to move, scroll to zoom and click a node to see it.'),
        'noText' => __('This node has no text yet.'),
        'ending' => __('Ending'),
        'endingReached' => __('Ending reached.'),
        'blocked' => __('No option is available with the current state.'),
        'hidden' => __(':count option hidden by its condition|:count options hidden by their conditions'),
        'variables' => __('Variables'),
        'condition' => __('Condition: :condition'),
        'effects' => __('Effects: :effects'),
        'yes' => __('true'),
        'no' => __('false'),
        'notes' => __('Author notes'),
    ];
    $playtest = $playtest ?? false;
    $startNodeId = $startNodeId ?? null;
    // @json separa su argumento por comas: el array se prepara aquí.
    $meta = ['texts' => $texts, 'types' => $typeLabels, 'playtest' => $playtest, 'start' => $startNodeId];
    $nodeCount = count($graph['nodes']);
    $edgeCount = count($graph['edges']);
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ __('Interactive dialogues') }} · {{ $project->title }}</title>
    <style>
        :root {
            --bg: #101411; --panel: #161c17; --panel-2: #1c241d; --border: #2c372c; --text: #e8eee2;
            --muted: #a7ba9c; --primary: #c2e88d; --primary-ink: #172012; --danger: #f87171; --warn: #fbbf24;
            --node-w: 240px; --node-h: 118px;
        }
        * { box-sizing: border-box; }
        html, body { height: 100%; }
        body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif; display: flex; flex-direction: column; }
        button { font: inherit; color: inherit; }
        header { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; padding: 14px 20px; border-bottom: 1px solid var(--border); background: var(--panel); }
        header h1 { margin: 0; font-size: 17px; font-weight: 650; overflow-wrap: anywhere; }
        header .meta { color: var(--muted); font-size: 12px; }
        .tabs { display: flex; gap: 4px; margin-left: auto; background: var(--bg); padding: 3px; border-radius: 8px; border: 1px solid var(--border); }
        .tabs button { border: 0; background: transparent; padding: 6px 14px; border-radius: 6px; cursor: pointer; color: var(--muted); font-weight: 600; font-size: 13px; }
        .tabs button[aria-selected="true"] { background: var(--primary); color: var(--primary-ink); }
        main { flex: 1; min-height: 0; display: flex; }
        .view { flex: 1; min-height: 0; display: none; }
        .view.active { display: flex; }
        .empty { margin: auto; color: var(--muted); padding: 40px 20px; text-align: center; }

        /* Mapa */
        #map-view { position: relative; }
        .viewport { position: relative; flex: 1; overflow: hidden; cursor: grab; touch-action: none;
            background-image: radial-gradient(circle, #263026 1px, transparent 1px); background-size: 22px 22px; }
        .viewport.dragging { cursor: grabbing; }
        .world { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
        .world svg { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; }
        .edge { fill: none; stroke: #5f705c; stroke-width: 1.6; }
        .edge.manual { stroke-dasharray: 6 4; }
        .edge.trail { stroke: var(--primary); stroke-width: 2.4; }
        .edge-label { font-size: 11px; fill: #cdd9c4; paint-order: stroke; stroke: var(--bg); stroke-width: 4px; stroke-linejoin: round; }
        .node { position: absolute; width: var(--node-w); height: var(--node-h); padding: 10px 12px; border-radius: 10px; background: var(--panel-2);
            border: 1px solid var(--border); border-left: 4px solid var(--type, #71717a); cursor: pointer; overflow: hidden; user-select: none;
            box-shadow: 0 6px 18px rgba(0, 0, 0, .35); }
        .node:hover { border-color: #4b5b48; border-left-color: var(--type, #71717a); }
        .node.selected { outline: 2px solid var(--primary); outline-offset: 2px; }
        .node.visited { background: #223024; }
        .node.current { box-shadow: 0 0 0 3px rgba(194, 232, 141, .35), 0 6px 18px rgba(0, 0, 0, .35); }
        .node h3 { margin: 0 0 2px; font-size: 13px; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .node .who { font-size: 11px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .node p { margin: 6px 0 0; font-size: 12px; color: #c4d0bc; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .badge { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; padding: 1px 6px; border-radius: 4px; }
        .badge.start { background: var(--primary); color: var(--primary-ink); }
        .badge.warn { background: rgba(251, 191, 36, .15); color: var(--warn); }
        .badge.error { background: rgba(248, 113, 113, .15); color: var(--danger); }
        .badge.end { background: rgba(194, 232, 141, .12); color: var(--primary); border: 1px solid rgba(194, 232, 141, .4); }
        .badge.test { background: rgba(251, 191, 36, .15); color: var(--warn); font-size: 11px; padding: 3px 8px; }
        .vars { margin-top: 20px; border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; background: var(--panel); font-size: 13px; }
        .vars h3 { margin: 0 0 8px; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
        .vars dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 4px 14px; }
        .vars dt { font-family: ui-monospace, monospace; color: var(--muted); }
        .vars dd { margin: 0; font-family: ui-monospace, monospace; }
        .vars dd.changed { color: var(--primary); font-weight: 700; }
        .node .badges { position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; }
        .toolbar { position: absolute; left: 12px; bottom: 12px; display: flex; gap: 6px; align-items: center; }
        .toolbar button, .btn { border: 1px solid var(--border); background: var(--panel); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; }
        .toolbar button:hover, .btn:hover { border-color: var(--primary); }
        .btn.primary { background: var(--primary); color: var(--primary-ink); border-color: var(--primary); font-weight: 650; }
        .btn:disabled { opacity: .45; cursor: default; border-color: var(--border); }
        .hint { color: var(--muted); font-size: 11px; margin-left: 6px; }
        .legend { position: absolute; right: 12px; bottom: 12px; display: flex; flex-wrap: wrap; gap: 6px 12px; max-width: 60%; justify-content: flex-end; font-size: 11px; color: var(--muted); }
        .legend span::before { content: ''; display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 5px; background: var(--type); vertical-align: -1px; }
        aside { width: 340px; flex-shrink: 0; border-left: 1px solid var(--border); background: var(--panel); overflow-y: auto; padding: 18px; }
        aside h2 { margin: 0 0 6px; font-size: 16px; overflow-wrap: anywhere; }
        aside dl { margin: 12px 0; display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; font-size: 12px; }
        aside dt { color: var(--muted); }
        aside dd { margin: 0; overflow-wrap: anywhere; }
        .section-title { margin: 18px 0 8px; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
        .text { white-space: pre-wrap; overflow-wrap: anywhere; }
        .opt-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        .opt-list button { width: 100%; text-align: left; }
        .note { display: block; font-size: 11px; color: var(--muted); margin-top: 2px; }
        .warning-item { font-size: 12px; margin: 4px 0; }

        /* Lectura */
        #play-view { overflow-y: auto; }
        .reader { width: 100%; max-width: 720px; margin: 0 auto; padding: 32px 20px 60px; }
        .trail { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; font-size: 12px; color: var(--muted); margin-bottom: 24px; }
        .trail button { border: 0; background: none; padding: 0; color: var(--muted); cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
        .trail .choice { color: #8fa384; font-style: italic; }
        .passage { background: var(--panel); border: 1px solid var(--border); border-left: 4px solid var(--type, #71717a); border-radius: 12px; padding: 24px; }
        .passage h2 { margin: 0; font-size: 22px; overflow-wrap: anywhere; }
        .passage .who { color: var(--muted); font-size: 13px; margin-top: 4px; }
        .passage .text { margin: 18px 0 0; font-size: 16px; line-height: 1.7; }
        .passage .condition { margin-top: 14px; font-size: 12px; color: var(--warn); }
        .link { border: 0; background: none; padding: 0; color: var(--primary); font-weight: 600; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
        .link:disabled { color: var(--danger); cursor: default; text-decoration: line-through; }
        .choices { margin-top: 22px; display: grid; gap: 8px; }
        .choices button { text-align: left; padding: 12px 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--panel-2); cursor: pointer; font-size: 15px; }
        .choices button:hover:not(:disabled) { border-color: var(--primary); }
        .choices button:disabled { opacity: .5; cursor: default; }
        .ending { margin-top: 22px; padding: 14px; border-radius: 8px; border: 1px dashed var(--border); color: var(--muted); text-align: center; }
        .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
        footer { padding: 8px 20px; font-size: 11px; color: var(--muted); border-top: 1px solid var(--border); }

        @media (max-width: 820px) {
            #map-view.active { flex-direction: column; }
            .viewport { min-height: 55vh; }
            aside { width: auto; border-left: 0; border-top: 1px solid var(--border); max-height: 45vh; }
            .tabs { margin-left: 0; }
            .legend { display: none; }
            .hint { display: none; }
        }
    </style>
</head>
<body>
    <header>
        <div>
            <h1>{{ $project->title }}</h1>
            @if ($playtest)
                <span class="badge test">{{ __('Test run · nothing is saved') }}</span>
            @endif
            <div class="meta">{{ __('Interactive dialogues') }} · {{ trans_choice(':count node|:count nodes', $nodeCount) }} · {{ trans_choice(':count connection|:count connections', $edgeCount) }} · {{ now()->translatedFormat('j F Y') }}</div>
        </div>
        <div class="tabs" role="tablist">
            <button type="button" role="tab" id="tab-map" aria-selected="true">{{ $texts['map'] }}</button>
            <button type="button" role="tab" id="tab-play" aria-selected="false">{{ $texts['play'] }}</button>
        </div>
    </header>

    <main>
        <section id="map-view" class="view active"></section>
        <section id="play-view" class="view"></section>
    </main>

    <footer>{{ __('Exported from GAMERDUST.') }}</footer>

    <script type="application/json" id="graph-data">@json($graph)</script>
    <script type="application/json" id="texts-data">@json($meta)</script>
    @include('reports.partials.branching-state')
    <script>
        (function () {
            'use strict';

            var graph = JSON.parse(document.getElementById('graph-data').textContent);
            var meta = JSON.parse(document.getElementById('texts-data').textContent);
            var T = meta.texts;
            var NODE_W = 240, NODE_H = 118, COLUMN_GAP = 120, ROW_GAP = 40, PAD = 80;
            // Mismos colores por tipo que el minimapa del editor de ramificación.
            var TYPE_COLORS = {
                cutscene: '#8b5cf6', ambient: '#71717a', bark: '#eab308', interactive_no_branch: '#0ea5e9',
                interactive_rubber_banding: '#f59e0b', interactive_alternative_paths: '#d946ef'
            };
            var REF = /\{\{([^{}\r\n]+?)\}\}/g;

            var nodes = graph.nodes;
            var byId = {};
            nodes.forEach(function (node) { byId[node.id] = node; });
            var warningsById = {};
            graph.warnings.forEach(function (warning) { (warningsById[warning.node_id] = warningsById[warning.node_id] || []).push(warning); });

            // history: nodos visitados; choices: opción elegida entre cada uno; states: variables al llegar a cada nodo.
            // Volver atrás recupera el estado guardado, así que los efectos se aplican una sola vez por elección.
            var variables = graph.variables || [];
            var state = { selected: null, history: [], choices: [], states: [] };

            function el(tag, attrs, children) {
                var node = document.createElement(tag);
                Object.keys(attrs || {}).forEach(function (key) {
                    if (key === 'text') { node.textContent = attrs[key]; }
                    else if (key === 'class') { node.className = attrs[key]; }
                    else if (key.indexOf('on') === 0) { node.addEventListener(key.slice(2), attrs[key]); }
                    else if (key === 'style') { node.setAttribute('style', attrs[key]); }
                    else if (attrs[key] !== false && attrs[key] !== null && attrs[key] !== undefined) { node.setAttribute(key, attrs[key] === true ? '' : attrs[key]); }
                });
                (children || []).forEach(function (child) { if (child) { node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child); } });
                return node;
            }

            function svg(tag, attrs) {
                var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
                Object.keys(attrs).forEach(function (key) { node.setAttribute(key, attrs[key]); });
                return node;
            }

            function normalize(value) { return String(value).replace(/\s+/g, ' ').trim().toLowerCase(); }
            function typeColor(node) { return TYPE_COLORS[node.dialogue_type] || '#71717a'; }
            function typeLabel(node) { return meta.types[node.dialogue_type] || node.dialogue_type || ''; }
            function format(template, key, value) { return template.replace(':' + key, value); }
            function who(node) { return [node.character_name, node.scene_title].filter(Boolean).join(' · '); }
            function plain(text) { return (text || '').replace(REF, '$1'); }
            function valueText(value) { return typeof value === 'boolean' ? (value ? T.yes : T.no) : String(value); }
            function conditionText(condition) {
                return condition && condition.var ? condition.var + ' ' + condition.op + ' ' + valueText(condition.value) : '';
            }
            function effectsText(effects) {
                return (effects || []).map(function (effect) {
                    var sign = effect.op === 'add' ? ' + ' : effect.op === 'sub' ? ' − ' : ' = ';
                    return effect.var + sign + valueText(effect.value);
                }).join(', ');
            }
            function optionNotes(option) {
                return [
                    option.condition && option.condition.var ? el('span', { class: 'note', text: format(T.condition, 'condition', conditionText(option.condition)) }) : null,
                    option.effects && option.effects.length ? el('span', { class: 'note', text: format(T.effects, 'effects', effectsText(option.effects)) }) : null,
                    option.required_condition ? el('span', { class: 'note', text: format(T.requires, 'condition', option.required_condition) }) : null,
                    option.consequence ? el('span', { class: 'note', text: format(T.consequence, 'consequence', option.consequence) }) : null
                ];
            }
            function currentState() { return state.states[state.states.length - 1] || {}; }

            /* ---------- Posiciones: las del editor; si faltan, capas por distancia desde el inicio ---------- */
            function layout() {
                var outgoing = {};
                graph.edges.forEach(function (edge) { (outgoing[edge.source] = outgoing[edge.source] || []).push(edge.target); });
                var depth = {}, maxDepth = -1;
                var roots = [graph.start_node_id].concat(nodes.map(function (node) { return node.id; }));
                roots.forEach(function (root) {
                    if (root === null || depth[root] !== undefined) { return; }
                    depth[root] = maxDepth + 1;
                    var frontier = [root];
                    while (frontier.length) {
                        var current = frontier.shift();
                        maxDepth = Math.max(maxDepth, depth[current]);
                        (outgoing[current] || []).forEach(function (next) {
                            if (depth[next] === undefined) { depth[next] = depth[current] + 1; frontier.push(next); }
                        });
                    }
                });
                var rows = {}, positions = {};
                nodes.forEach(function (node) {
                    if (node.pos_x !== null && node.pos_y !== null) {
                        positions[node.id] = { x: node.pos_x, y: node.pos_y };
                        return;
                    }
                    var column = depth[node.id] || 0;
                    var row = rows[column] || 0;
                    rows[column] = row + 1;
                    positions[node.id] = { x: column * (NODE_W + COLUMN_GAP), y: row * (NODE_H + ROW_GAP) };
                });
                return positions;
            }

            /* ---------- Mapa ---------- */
            var mapView = document.getElementById('map-view');
            var playView = document.getElementById('play-view');
            var nodeEls = {}, edgeEls = [], world, viewport, aside, view = { x: 0, y: 0, k: 1 }, bounds = { w: 0, h: 0 };

            function buildMap() {
                if (!nodes.length) {
                    mapView.appendChild(el('p', { class: 'empty', text: T.empty }));
                    return;
                }

                var positions = layout();
                var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                nodes.forEach(function (node) {
                    var p = positions[node.id];
                    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
                    maxX = Math.max(maxX, p.x + NODE_W); maxY = Math.max(maxY, p.y + NODE_H);
                });
                Object.keys(positions).forEach(function (id) { positions[id] = { x: positions[id].x - minX + PAD, y: positions[id].y - minY + PAD }; });
                bounds = { w: maxX - minX + PAD * 2, h: maxY - minY + PAD * 2 };

                viewport = el('div', { class: 'viewport' });
                world = el('div', { class: 'world', style: 'width:' + bounds.w + 'px;height:' + bounds.h + 'px' });
                var canvas = svg('svg', { width: bounds.w, height: bounds.h });
                var defs = svg('defs', {});
                [['arrow', '#5f705c'], ['arrow-trail', '#c2e88d']].forEach(function (marker) {
                    var m = svg('marker', { id: marker[0], viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
                    m.appendChild(svg('path', { d: 'M0,0 L10,5 L0,10 z', fill: marker[1] }));
                    defs.appendChild(m);
                });
                canvas.appendChild(defs);

                // Aristas con el mismo origen y destino se separan un poco para que no se pisen.
                var pairCount = {};
                graph.edges.forEach(function (edge) {
                    var a = positions[edge.source], b = positions[edge.target];
                    if (!a || !b) { return; }
                    var pair = edge.source + '-' + edge.target;
                    var offset = (pairCount[pair] = (pairCount[pair] || 0) + 1) - 1;
                    var d, lx, ly;
                    if (edge.source === edge.target) {
                        var sx = a.x + NODE_W - 40, sy = a.y, r = 34 + offset * 14;
                        d = 'M' + sx + ',' + sy + ' C' + (sx - 10) + ',' + (sy - r * 2) + ' ' + (sx + 60) + ',' + (sy - r * 2) + ' ' + (a.x + NODE_W) + ',' + (a.y + 22);
                        lx = sx + 25; ly = sy - r * 1.5 - 4;
                    } else {
                        var x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2 + offset * 12;
                        var x2 = b.x, y2 = b.y + NODE_H / 2 + offset * 12;
                        var bend = Math.max(60, Math.abs(x2 - x1) / 2);
                        var c1x = x1 + bend, c2x = x2 - bend;
                        d = 'M' + x1 + ',' + y1 + ' C' + c1x + ',' + y1 + ' ' + c2x + ',' + y2 + ' ' + x2 + ',' + y2;
                        lx = (x1 + 3 * c1x + 3 * c2x + x2) / 8; ly = (y1 + 3 * y1 + 3 * y2 + y2) / 8 - 6;
                    }
                    var path = svg('path', { d: d, class: 'edge' + (edge.managed ? '' : ' manual'), 'marker-end': 'url(#arrow)' });
                    var label = svg('text', { x: lx, y: ly, class: 'edge-label', 'text-anchor': 'middle' });
                    label.textContent = edge.label.length > 30 ? edge.label.slice(0, 29) + '…' : edge.label;
                    canvas.appendChild(path);
                    canvas.appendChild(label);
                    edgeEls.push({ edge: edge, path: path });
                });
                world.appendChild(canvas);

                nodes.forEach(function (node) {
                    var p = positions[node.id];
                    var warnings = warningsById[node.id] || [];
                    var hasError = warnings.some(function (w) { return w.severity === 'error'; });
                    var badges = el('div', { class: 'badges' }, [
                        node.is_start ? el('span', { class: 'badge start', text: T.start }) : null,
                        node.is_ending ? el('span', { class: 'badge end', text: T.ending }) : null,
                        warnings.length ? el('span', { class: 'badge ' + (hasError ? 'error' : 'warn'), text: '!', title: warnings.map(function (w) { return w.message; }).join('\n') }) : null
                    ]);
                    var card = el('div', {
                        class: 'node', 'data-id': node.id, style: 'left:' + p.x + 'px;top:' + p.y + 'px;--type:' + typeColor(node),
                        title: node.display_title
                    }, [
                        badges,
                        el('h3', { text: node.display_title, style: 'padding-right:' + ((node.is_start ? 60 : 20) + (node.is_ending ? 50 : 0)) + 'px' }),
                        el('div', { class: 'who', text: who(node) || typeLabel(node) }),
                        el('p', { text: plain(node.text) })
                    ]);
                    nodeEls[node.id] = card;
                    world.appendChild(card);
                });

                viewport.appendChild(world);
                var toolbar = el('div', { class: 'toolbar' }, [
                    el('button', { type: 'button', text: '−', title: T.zoomOut, 'aria-label': T.zoomOut, onclick: function () { zoomAt(0.8); } }),
                    el('button', { type: 'button', text: '+', title: T.zoomIn, 'aria-label': T.zoomIn, onclick: function () { zoomAt(1.25); } }),
                    el('button', { type: 'button', text: T.fit, onclick: fit }),
                    el('span', { class: 'hint', text: T.mapHint })
                ]);
                var used = {};
                nodes.forEach(function (node) { used[node.dialogue_type] = true; });
                var legend = el('div', { class: 'legend' }, Object.keys(used).map(function (type) {
                    return el('span', { style: '--type:' + (TYPE_COLORS[type] || '#71717a'), text: meta.types[type] || type });
                }));
                viewport.appendChild(toolbar);
                viewport.appendChild(legend);
                aside = el('aside', {});
                mapView.appendChild(viewport);
                mapView.appendChild(aside);

                bindPanZoom();
                renderAside();
            }

            function applyView() { world.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.k + ')'; }

            function fit() {
                var rect = viewport.getBoundingClientRect();
                if (!rect.width) { return; }
                view.k = Math.min(rect.width / bounds.w, rect.height / bounds.h, 1.1);
                view.x = (rect.width - bounds.w * view.k) / 2;
                view.y = (rect.height - bounds.h * view.k) / 2;
                applyView();
            }

            function zoomAt(factor, cx, cy) {
                var rect = viewport.getBoundingClientRect();
                cx = cx === undefined ? rect.width / 2 : cx;
                cy = cy === undefined ? rect.height / 2 : cy;
                var k = Math.min(2.5, Math.max(0.15, view.k * factor));
                view.x = cx - (cx - view.x) * (k / view.k);
                view.y = cy - (cy - view.y) * (k / view.k);
                view.k = k;
                applyView();
            }

            function centerOn(id) {
                var card = nodeEls[id];
                if (!card) { return; }
                var rect = viewport.getBoundingClientRect();
                view.x = rect.width / 2 - (parseFloat(card.style.left) + NODE_W / 2) * view.k;
                view.y = rect.height / 2 - (parseFloat(card.style.top) + NODE_H / 2) * view.k;
                applyView();
            }

            function bindPanZoom() {
                var drag = null;
                viewport.addEventListener('pointerdown', function (event) {
                    if (event.target.closest('.toolbar')) { return; }
                    drag = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y, moved: false, target: event.target };
                    viewport.setPointerCapture(event.pointerId);
                });
                viewport.addEventListener('pointermove', function (event) {
                    if (!drag) { return; }
                    var dx = event.clientX - drag.x, dy = event.clientY - drag.y;
                    if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 4) { drag.moved = true; viewport.classList.add('dragging'); }
                    if (drag.moved) { view.x = drag.vx + dx; view.y = drag.vy + dy; applyView(); }
                });
                viewport.addEventListener('pointerup', function () {
                    if (drag && !drag.moved) {
                        var card = drag.target.closest && drag.target.closest('.node');
                        if (card) { select(Number(card.getAttribute('data-id'))); }
                    }
                    drag = null;
                    viewport.classList.remove('dragging');
                });
                viewport.addEventListener('wheel', function (event) {
                    event.preventDefault();
                    var rect = viewport.getBoundingClientRect();
                    zoomAt(event.deltaY < 0 ? 1.12 : 0.89, event.clientX - rect.left, event.clientY - rect.top);
                }, { passive: false });
                window.addEventListener('resize', function () { if (mapView.classList.contains('active')) { fit(); } });
            }

            function select(id) {
                state.selected = id;
                Object.keys(nodeEls).forEach(function (key) { nodeEls[key].classList.toggle('selected', Number(key) === id); });
                renderAside();
            }

            function renderAside() {
                aside.innerHTML = '';
                var node = byId[state.selected];
                if (!node) {
                    aside.appendChild(el('p', { class: 'hint', style: 'margin:0', text: T.selectHint }));
                    return;
                }
                var rows = [[T.character, node.character_name], [T.scene, node.scene_title], [T.tone, node.emotional_tone], [T.trigger, node.trigger_condition]];
                var dl = el('dl', {});
                rows.forEach(function (row) {
                    if (row[1]) { dl.appendChild(el('dt', { text: row[0] })); dl.appendChild(el('dd', { text: row[1] })); }
                });
                aside.appendChild(el('div', {}, [
                    node.is_start ? el('span', { class: 'badge start', text: T.startNode }) : null,
                    node.is_ending ? el('span', { class: 'badge end', text: T.ending }) : null,
                    el('h2', { text: node.display_title }),
                    el('span', { class: 'badge', style: 'padding-left:0;color:' + typeColor(node), text: typeLabel(node) })
                ]));
                aside.appendChild(dl);
                aside.appendChild(el('div', { class: 'text', text: plain(node.text) || T.noText }));

                if (node.options.length) {
                    aside.appendChild(el('div', { class: 'section-title', text: T.options }));
                    aside.appendChild(el('ul', { class: 'opt-list' }, node.options.map(function (option) {
                        var target = byId[option.next_dialogue_node_id];
                        return el('li', {}, [el('button', {
                            type: 'button', class: 'btn', disabled: !target,
                            onclick: function () { if (target) { select(target.id); centerOn(target.id); } }
                        }, [
                            option.player_option + ' → ' + (target ? target.display_title : T.noTarget)
                        ].concat(optionNotes(option)))]);
                    })));
                }

                var warnings = warningsById[node.id] || [];
                if (warnings.length) {
                    aside.appendChild(el('div', { class: 'section-title', text: T.warnings }));
                    warnings.forEach(function (w) {
                        aside.appendChild(el('p', { class: 'warning-item', style: 'color:' + (w.severity === 'error' ? 'var(--danger)' : w.severity === 'warning' ? 'var(--warn)' : 'var(--muted)'), text: w.message }));
                    });
                }

                aside.appendChild(el('div', { class: 'actions' }, [
                    el('button', { type: 'button', class: 'btn primary', text: T.playFromHere, onclick: function () { startPlay(node.id); } })
                ]));
            }

            /* ---------- Lectura (modo Twine) ---------- */
            function startPlay(id) {
                state.history = id ? [id] : [];
                state.choices = [];
                state.states = id ? [BranchingState.initialState(variables)] : [];
                show('play');
                renderPlay();
            }

            function go(option) {
                // Doble clic o una opción ya no disponible: no se aplica nada.
                if (!BranchingState.isAvailable(option.condition, currentState())) { return; }
                state.states.push(BranchingState.apply(option.effects, currentState()));
                state.choices.push(option.player_option);
                state.history.push(option.next_dialogue_node_id);
                renderPlay();
                playView.scrollTop = 0;
            }

            function back() {
                if (state.history.length > 1) { state.history.pop(); state.choices.pop(); state.states.pop(); renderPlay(); }
            }

            function markTrail() {
                var visited = {}, steps = {};
                state.history.forEach(function (id, index) {
                    visited[id] = true;
                    if (index > 0) { steps[state.history[index - 1] + '-' + id] = true; }
                });
                var current = state.history[state.history.length - 1];
                Object.keys(nodeEls).forEach(function (key) {
                    nodeEls[key].classList.toggle('visited', !!visited[key]);
                    nodeEls[key].classList.toggle('current', Number(key) === current);
                });
                edgeEls.forEach(function (item) {
                    var on = !!steps[item.edge.source + '-' + item.edge.target];
                    item.path.classList.toggle('trail', on);
                    item.path.setAttribute('marker-end', on ? 'url(#arrow-trail)' : 'url(#arrow)');
                });
            }

            function renderPlay() {
                playView.innerHTML = '';
                var reader = el('div', { class: 'reader' });
                playView.appendChild(reader);
                var node = byId[state.history[state.history.length - 1]];
                if (!node) {
                    reader.appendChild(el('p', { class: 'empty', text: T.empty }));
                    return;
                }
                markTrail();

                // Recorrido: nodos visitados y la opción elegida entre cada uno.
                if (state.history.length > 1) {
                    var trail = el('nav', { class: 'trail', 'aria-label': T.path });
                    state.history.forEach(function (id, index) {
                        if (index > 0) { trail.appendChild(el('span', { class: 'choice', text: '→ ' + state.choices[index - 1] + ' →' })); }
                        var step = byId[id];
                        trail.appendChild(index === state.history.length - 1
                            ? el('strong', { text: step.display_title })
                            : el('button', { type: 'button', text: step.display_title, onclick: function () {
                                state.history = state.history.slice(0, index + 1);
                                state.choices = state.choices.slice(0, index);
                                state.states = state.states.slice(0, index + 1);
                                renderPlay();
                            } }));
                    });
                    reader.appendChild(trail);
                }

                // Las referencias @{{Título}} del texto son enlaces (opciones administradas); el resto, botones.
                // Las opciones cuya condición no se cumple con el estado actual no se muestran.
                var now = currentState();
                var available = node.options.filter(function (option) { return BranchingState.isAvailable(option.condition, now); });
                var hiddenCount = node.options.length - available.length;
                var managed = {}, used = {};
                node.options.forEach(function (option) { if (option.managed) { used[option.id] = true; } });
                available.forEach(function (option) { if (option.managed) { managed[normalize(option.player_option)] = option; } });
                var text = el('div', { class: 'text' });
                var source = node.text || '', last = 0, match;
                REF.lastIndex = 0;
                while ((match = REF.exec(source)) !== null) {
                    text.appendChild(document.createTextNode(source.slice(last, match.index)));
                    var option = managed[normalize(match[1])];
                    var label = match[1].trim();
                    if (option) {
                        used[option.id] = true;
                        text.appendChild(el('button', {
                            type: 'button', class: 'link', text: label, disabled: !byId[option.next_dialogue_node_id],
                            onclick: (function (opt) { return function () { go(opt); }; })(option)
                        }));
                    } else {
                        text.appendChild(document.createTextNode(label));
                    }
                    last = REF.lastIndex;
                }
                text.appendChild(document.createTextNode(source.slice(last)));
                if (!source.trim()) { text.appendChild(el('span', { class: 'hint', style: 'margin:0', text: T.noText })); }

                var rest = available.filter(function (option) { return !used[option.id]; });
                var reachable = available.filter(function (option) { return byId[option.next_dialogue_node_id]; });
                var passage = el('article', { class: 'passage', style: '--type:' + typeColor(node) }, [
                    el('h2', { text: node.display_title }),
                    el('div', { class: 'who', text: [typeLabel(node), who(node), node.emotional_tone].filter(Boolean).join(' · ') }),
                    node.trigger_condition ? el('div', { class: 'condition', text: format(T.requires, 'condition', node.trigger_condition) }) : null,
                    text,
                    rest.length ? el('div', { class: 'choices' }, rest.map(function (opt) {
                        var target = byId[opt.next_dialogue_node_id];
                        return el('button', { type: 'button', disabled: !target, onclick: function () { go(opt); } }, [
                            opt.player_option + (target ? '' : ' (' + T.noTarget + ')')
                        ].concat(optionNotes(opt)));
                    })) : null,
                    hiddenCount ? el('p', { class: 'hint', style: 'margin:12px 0 0', text: choiceText(T.hidden, hiddenCount) }) : null,
                    node.is_ending ? el('div', { class: 'ending', text: T.endingReached })
                        : !node.options.length ? el('div', { class: 'ending', text: T.end })
                        : !reachable.length ? el('div', { class: 'ending', text: T.blocked }) : null
                ]);
                reader.appendChild(passage);
                reader.appendChild(renderVariables());

                reader.appendChild(el('div', { class: 'actions' }, [
                    el('button', { type: 'button', class: 'btn', text: '← ' + T.back, disabled: state.history.length < 2, onclick: back }),
                    el('button', { type: 'button', class: 'btn', text: T.restart, onclick: function () { startPlay(graph.start_node_id); } }),
                    el('button', { type: 'button', class: 'btn', text: T.viewOnMap, onclick: function () { show('map'); select(node.id); centerOn(node.id); } })
                ]));
            }

            // Plurales "uno|varios" ya traducidos desde PHP.
            function choiceText(template, count) {
                var forms = template.split('|');
                return (count === 1 ? forms[0] : forms[forms.length - 1]).replace(':count', count);
            }

            // Valores actuales; los que cambió la última elección se resaltan.
            function renderVariables() {
                if (!variables.length) { return null; }
                var now = currentState(), before = state.states[state.states.length - 2] || now;
                var dl = el('dl', {});
                variables.forEach(function (variable) {
                    if (!Object.prototype.hasOwnProperty.call(now, variable.key)) { return; }
                    dl.appendChild(el('dt', { text: variable.key, title: variable.description || '' }));
                    dl.appendChild(el('dd', { class: now[variable.key] !== before[variable.key] ? 'changed' : '', text: valueText(now[variable.key]) }));
                });
                return el('section', { class: 'vars', 'aria-live': 'polite' }, [el('h3', { text: T.variables }), dl]);
            }

            /* ---------- Pestañas ---------- */
            var tabs = { map: document.getElementById('tab-map'), play: document.getElementById('tab-play') };
            var fitted = false;

            function show(name) {
                mapView.classList.toggle('active', name === 'map');
                playView.classList.toggle('active', name === 'play');
                tabs.map.setAttribute('aria-selected', String(name === 'map'));
                tabs.play.setAttribute('aria-selected', String(name === 'play'));
                if (name === 'map' && viewport && !fitted) { fitted = true; fit(); }
            }

            tabs.map.addEventListener('click', function () { show('map'); });
            tabs.play.addEventListener('click', function () {
                if (!state.history.length) { startPlay(graph.start_node_id); } else { show('play'); renderPlay(); }
            });
            document.addEventListener('keydown', function (event) {
                if (playView.classList.contains('active') && event.key === 'Backspace' && event.target === document.body) { event.preventDefault(); back(); }
            });

            buildMap();
            if (meta.playtest) {
                // "Probar recorrido": se abre directamente en Jugar, desde el nodo pedido o el inicio.
                startPlay(meta.start || graph.start_node_id);
            } else {
                show('map');
            }
        })();
    </script>
</body>
</html>
