{{-- Reporte de análisis imprimible (HU 57). Solo lenguaje narrativo: los valores internos del modelo emocional no se muestran. --}}
@php
    $summary = $report['summary'];
    $alertLabel = fn (?string $level) => match ($level) {
        'red' => __('Unexplained jump'),
        'amber' => __('Justified jump'),
        default => '',
    };
    $statusTitles = [
        'pending' => __('Pending'),
        'resolved' => __('Resolved'),
        'dismissed' => __('Dismissed'),
    ];
    $date = fn ($value) => $value?->translatedFormat('j M Y, H:i');
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ __('Analysis report') }} · {{ $project->title }}</title>
    <style>
        @page { size: A4; margin: 2cm; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #e5e7df; color: #1d2418; font: 10.5pt/1.5 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
        .page { max-width: 21cm; margin: 24px auto; background: #fff; padding: 2cm; box-shadow: 0 6px 30px rgba(0,0,0,.15); }
        header { border-bottom: 2px solid #1d2418; padding-bottom: .5cm; margin-bottom: .6cm; }
        header p { margin: .1cm 0; color: #4e5a46; }
        h1 { font-size: 20pt; margin: 0 0 .2cm; }
        h2 { font-size: 13pt; margin: .9cm 0 .3cm; padding-bottom: .1cm; border-bottom: 1px solid #c9d0c0; page-break-after: avoid; }
        h3 { font-size: 11pt; margin: .5cm 0 .15cm; page-break-after: avoid; }
        .kicker { font-size: 8pt; letter-spacing: .12em; text-transform: uppercase; color: #6b7563; margin: 0; }
        .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 0; padding: 0; list-style: none; }
        .metrics li { border: 1px solid #d4dacb; padding: 8px 10px; }
        .metrics strong { display: block; font-size: 15pt; }
        .metrics span { font-size: 8.5pt; color: #4e5a46; }
        table { width: 100%; border-collapse: collapse; font-size: 9pt; }
        th, td { border-bottom: 1px solid #dde2d6; padding: 5px 6px; text-align: left; vertical-align: top; }
        th { font-size: 8pt; text-transform: uppercase; letter-spacing: .06em; color: #4e5a46; border-bottom-color: #9aa58f; }
        tr { page-break-inside: avoid; }
        .tag { display: inline-block; font-size: 8pt; padding: 1px 6px; border: 1px solid currentColor; border-radius: 9px; white-space: nowrap; }
        .red { color: #b3261e; }
        .amber { color: #a35f00; }
        .ok { color: #2e6b2a; }
        .muted { color: #6b7563; }
        .scene { page-break-inside: avoid; border-top: 1px solid #dde2d6; padding-top: .2cm; margin-top: .4cm; }
        ul.items { margin: .1cm 0 .2cm; padding-left: .5cm; }
        ul.items li { margin-bottom: .12cm; }
        blockquote { margin: .1cm 0; padding-left: .3cm; border-left: 3px solid #c9d0c0; color: #3c4636; font-style: italic; }
        .empty { color: #6b7563; font-style: italic; }
        .toolbar { position: sticky; top: 0; display: flex; gap: 12px; justify-content: center; padding: 12px; background: #101411; }
        .toolbar button { font: 600 13px system-ui, sans-serif; padding: 8px 16px; border-radius: 6px; border: 0; background: #c2e88d; color: #172012; cursor: pointer; }
        @media (max-width: 640px) { .page { padding: 16px; margin: 0; } .metrics { grid-template-columns: repeat(2, 1fr); } }
        @media print {
            body { background: #fff; }
            .toolbar { display: none; }
            .page { margin: 0; padding: 0; box-shadow: none; max-width: none; }
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <button type="button" onclick="window.print()">{{ __('Print or save as PDF') }}</button>
    </div>
    <main class="page">
        <header>
            <p class="kicker">{{ __('Analysis report') }}</p>
            <h1>{{ $project->title }}</h1>
            <p>
                @if ($project->game_genre){{ __($project->game_genre) }} · @endif{{ __('Generated on :date', ['date' => $date($report['generated_at'])]) }}
            </p>
            <p class="muted">{{ __('Emotions are described in narrative language: tone, tension and the character\'s control. Each analysis states the script version it read.') }}</p>
        </header>

        <section>
            <h2>{{ __('Summary') }}</h2>
            <ul class="metrics">
                <li><strong>{{ $summary['analyzed'] }} / {{ $summary['scenes'] }}</strong><span>{{ __('Scenes analyzed') }}</span></li>
                <li><strong>{{ $summary['stale'] }}</strong><span>{{ __('Out-of-date analyses') }}</span></li>
                <li><strong class="red">{{ $summary['red'] }}</strong><span>{{ __('Red alerts') }}</span></li>
                <li><strong class="amber">{{ $summary['amber'] }}</strong><span>{{ __('Amber alerts') }}</span></li>
                <li><strong>{{ $summary['inconsistencies'] }}</strong><span>{{ __('Inconsistencies') }}</span></li>
                <li><strong>{{ $summary['suggestions'] }}</strong><span>{{ __('Suggestions') }}</span></li>
                <li><strong>{{ count($report['validations']['pending']) }}</strong><span>{{ __('Pending validations') }}</span></li>
                <li><strong>{{ count($report['validations']['resolved']) + count($report['validations']['dismissed']) }}</strong><span>{{ __('Closed validations') }}</span></li>
            </ul>
        </section>

        <section>
            <h2>{{ __('Emotional metrics by scene') }}</h2>
            @if ($report['scenes'] === [])
                <p class="empty">{{ __('This project has no scenes yet.') }}</p>
            @else
                <table>
                    <thead>
                        <tr>
                            <th>{{ __('Scene') }}</th>
                            <th>{{ __('Emotion') }}</th>
                            <th>{{ __('Tone') }}</th>
                            <th>{{ __('Tension') }}</th>
                            <th>{{ __('Character\'s control') }}</th>
                            <th>{{ __('Alert') }}</th>
                            <th>{{ __('Version analyzed') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($report['scenes'] as $scene)
                            @php $analysis = $scene['analysis']; @endphp
                            <tr>
                                <td><strong>{{ $scene['code'] }}</strong> {{ $scene['title'] }}</td>
                                @if ($analysis)
                                    <td>{{ $analysis['emotion'] }}</td>
                                    <td>{{ $analysis['tone'] }}</td>
                                    <td>{{ $analysis['tension'] }}</td>
                                    <td>{{ $analysis['control'] }}</td>
                                    <td>@if ($analysis['alert'])<span class="tag {{ $analysis['alert'] }}">{{ $alertLabel($analysis['alert']) }}</span>@else<span class="muted">—</span>@endif</td>
                                    <td>
                                        @if ($analysis['version'])
                                            {{ __('Version #:id', ['id' => $analysis['version']['id']]) }}<br><span class="muted">{{ $date($analysis['version']['date']) }}</span><br>
                                        @endif
                                        @if ($analysis['stale'])
                                            <span class="tag amber">{{ __('Out of date') }}</span>
                                        @else
                                            <span class="tag ok">{{ __('Current version') }}</span>
                                        @endif
                                    </td>
                                @else
                                    <td colspan="6" class="empty">{{ __('Not analyzed yet.') }}</td>
                                @endif
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @endif
        </section>

        <section>
            <h2>{{ __('Red and amber alerts') }}</h2>
            <p class="muted">{{ __('Red: an abrupt emotional change with no visible cause. Amber: abrupt but justified by the scene.') }}</p>
            @forelse ($report['alerts'] as $alert)
                <ul class="items">
                    <li>
                        <span class="tag {{ $alert['level'] }}">{{ $alertLabel($alert['level']) }}</span>
                        <strong>{{ $alert['code'] }} {{ $alert['title'] }}</strong>@if ($alert['who']) · {{ $alert['who'] }}@endif
                        @if ($alert['explanation'])<br>{{ $alert['explanation'] }}@endif
                    </li>
                </ul>
            @empty
                <p class="empty">{{ __('No abrupt changes were detected.') }}</p>
            @endforelse
        </section>

        <section>
            <h2>{{ __('Inconsistencies and suggestions by scene') }}</h2>
            @php $analyzed = array_filter($report['scenes'], fn ($scene) => $scene['analysis'] !== null); @endphp
            @forelse ($analyzed as $scene)
                @php $analysis = $scene['analysis']; @endphp
                <div class="scene">
                    <h3>{{ $scene['code'] }} · {{ $scene['title'] }}</h3>
                    <p class="muted">
                        {{ __('Analyzed on :date', ['date' => $date($analysis['date'])]) }} · {{ $analysis['source'] }}
                        @if ($analysis['degraded']) · {{ __('the AI did not respond (keyword analysis)') }}@endif
                        @if ($analysis['previous_code']) · {{ __('compared with :code', ['code' => $analysis['previous_code']]) }}@endif
                    </p>
                    @if ($analysis['summary'])
                        <p>{{ $analysis['summary'] }}</p>
                    @endif
                    @if ($analysis['characters'] !== [])
                        <ul class="items">
                            @foreach ($analysis['characters'] as $character)
                                <li>
                                    <strong>{{ $character['name'] }}</strong>: {{ $character['emotion'] }} · {{ __('Tone') }} {{ mb_strtolower($character['tone']) }} · {{ __('Tension') }} {{ mb_strtolower($character['tension']) }} · {{ mb_strtolower($character['control']) }}
                                    @if ($character['out_of_character'])<span class="tag red">{{ __('Out of character') }}</span>@if ($character['out_of_character_reason']) {{ $character['out_of_character_reason'] }}@endif @endif
                                    @if ($character['evidence'])<blockquote>{{ $character['evidence'] }}</blockquote>@endif
                                </li>
                            @endforeach
                        </ul>
                    @endif

                    <p><strong>{{ __('Inconsistencies') }}</strong></p>
                    @forelse ($analysis['inconsistencies'] as $item)
                        <ul class="items">
                            <li>
                                <span class="tag">{{ $item['severity'] }}</span> {{ __('Contradicts: :entry', ['entry' => $item['contradicts']]) }}
                                @if ($item['fragment'])<blockquote>{{ $item['fragment'] }}</blockquote>@endif
                                {{ $item['explanation'] }}
                            </li>
                        </ul>
                    @empty
                        <p class="empty">{{ __('No inconsistencies were found.') }}</p>
                    @endforelse

                    <p><strong>{{ __('Suggestions') }}</strong></p>
                    @forelse ($analysis['suggestions'] as $item)
                        <ul class="items">
                            <li><span class="tag">{{ $item['kind'] }}</span> {{ $item['text'] }}@if ($item['why']) <span class="muted">({{ $item['why'] }})</span>@endif</li>
                        </ul>
                    @empty
                        <p class="empty">{{ __('No suggestions.') }}</p>
                    @endforelse
                </div>
            @empty
                <p class="empty">{{ __('No scene has been analyzed yet. Use "Analyze emotions" in the Script.') }}</p>
            @endforelse
        </section>

        <section>
            <h2>{{ __('Coherence validations by status') }}</h2>
            @foreach ($statusTitles as $status => $title)
                <h3>{{ $title }} ({{ count($report['validations'][$status]) }})</h3>
                @forelse ($report['validations'][$status] as $validation)
                    <ul class="items">
                        <li>
                            <span class="tag">{{ $validation['severity'] }}</span>
                            {{ $validation['message'] }}@if ($validation['subject']) <span class="muted">· {{ $validation['subject'] }}</span>@endif
                            @if ($validation['recommendation'])<br><span class="muted">{{ $validation['recommendation'] }}</span>@endif
                        </li>
                    </ul>
                @empty
                    <p class="empty">{{ __('None.') }}</p>
                @endforelse
            @endforeach
        </section>
    </main>
</body>
</html>
