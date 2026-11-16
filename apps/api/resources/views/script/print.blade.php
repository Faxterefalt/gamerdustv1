<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ __('Script') }} · {{ $project->title }}</title>
    <style>
        @page { size: A4; margin: 2.5cm 2cm 2.5cm 3cm; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #e5e7df; color: #1d2418; font: 12pt/1.5 'Courier Prime', 'Courier New', Courier, monospace; }
        .page { max-width: 21cm; margin: 24px auto; background: #fff; padding: 2.5cm 2cm 2.5cm 3cm; box-shadow: 0 6px 30px rgba(0,0,0,.15); }
        .cover { text-align: center; padding: 6cm 0 4cm; page-break-after: always; }
        .cover h1 { font-size: 20pt; text-transform: uppercase; margin: 0 0 1cm; }
        .cover p { margin: .2cm 0; }
        .scene { page-break-inside: auto; margin-bottom: 1.2cm; }
        .scene-meta { font-size: 9pt; color: #6b7563; margin-bottom: .4cm; letter-spacing: .08em; }
        .heading { font-weight: bold; text-transform: uppercase; margin: .6cm 0 .4cm; }
        .action { margin: 0 0 .4cm; }
        .character { text-transform: uppercase; margin: .5cm 0 0 6.5cm; }
        .parenthetical { margin: 0 0 0 5.2cm; max-width: 6cm; font-style: italic; }
        .dialogue { margin: 0 0 .4cm 3.8cm; max-width: 9cm; }
        p { white-space: pre-wrap; word-wrap: break-word; }
        .toolbar { position: sticky; top: 0; display: flex; gap: 12px; justify-content: center; padding: 12px; background: #101411; }
        .toolbar button { font: 600 13px system-ui, sans-serif; padding: 8px 16px; border-radius: 6px; border: 0; background: #c2e88d; color: #172012; cursor: pointer; }
        .empty { color: #6b7563; font-style: italic; }
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
        <section class="cover">
            <h1>{{ $project->title }}</h1>
            @if ($project->game_genre)
                <p>{{ __($project->game_genre) }}</p>
            @endif
            <p>{{ __('Script') }} · {{ now()->translatedFormat('j F Y') }}</p>
        </section>

        @forelse ($scenes as $index => $scene)
            <section class="scene">
                <div class="scene-meta">
                    E{{ str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT) }} · {{ $scene->title }}@if ($scene->act) · {{ $scene->act }}@endif
                </div>
                @forelse ($scene->script ?? [] as $block)
                    @if (filled($block['text'] ?? null))
                        <p class="{{ in_array($block['kind'] ?? '', \App\Services\Script\ScriptService::KINDS, true) ? $block['kind'] : 'action' }}">@if (($block['kind'] ?? '') === 'parenthetical' && ! str_starts_with(trim($block['text']), '('))({{ $block['text'] }})@else{{ $block['text'] }}@endif</p>
                    @endif
                @empty
                    <p class="empty">{{ __('This scene has no script yet.') }}</p>
                @endforelse
            </section>
        @empty
            <p class="empty">{{ __('This project has no scenes yet.') }}</p>
        @endforelse
    </main>
    <script>
        window.addEventListener('load', () => setTimeout(() => window.print(), 300));
    </script>
</body>
</html>
