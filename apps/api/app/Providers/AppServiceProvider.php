<?php

namespace App\Providers;

use App\Contracts\EmotionAnalyzer;
use App\Services\Emotion\KeywordEmotionAnalyzer;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Implementación del análisis emocional. Se elegirá según config('gamerdust.ai.driver');
        // hasta que exista la implementación con Groq solo hay la de palabras clave.
        $this->app->bind(EmotionAnalyzer::class, KeywordEmotionAnalyzer::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Llamadas de IA por usuario y minuto (presupuesto del plan gratuito de Groq).
        RateLimiter::for('ai', fn (Request $request) => Limit::perMinute((int) config('gamerdust.ai.rate_limit_per_minute', 10))
            ->by($request->user()?->id ?: $request->ip()));
    }
}
