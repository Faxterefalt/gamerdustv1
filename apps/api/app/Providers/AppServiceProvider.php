<?php

namespace App\Providers;

use App\Contracts\EmotionAnalyzer;
use App\Services\Ai\GroqClient;
use App\Services\Emotion\GroqEmotionAnalyzer;
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
        // Implementación del análisis emocional según config('gamerdust.ai.driver').
        // Sin clave de Groq se usa siempre el análisis por palabras clave.
        $this->app->bind(EmotionAnalyzer::class, fn ($app) => config('gamerdust.ai.driver') === 'groq' && $app->make(GroqClient::class)->isConfigured()
            ? $app->make(GroqEmotionAnalyzer::class)
            : $app->make(KeywordEmotionAnalyzer::class));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Llamadas de IA por usuario y minuto (presupuesto del plan gratuito de Groq).
        RateLimiter::for('ai', fn (Request $request) => Limit::perMinute((int) config('gamerdust.ai.rate_limit_per_minute', 10))
            ->by($request->user()?->id ?: $request->ip()));

        // Recuperar contraseña: 5 intentos por minuto y por IP + correo, y 20 por IP (evita sondear correos).
        // Al superarlo se vuelve al formulario con un aviso (no una página 429).
        RateLimiter::for('password-reset', function (Request $request) {
            $tooMany = fn () => back()->withErrors(['email' => __('passwords.throttled')])->onlyInput('email');

            return [
                Limit::perMinute(5)->by('password-reset:'.$request->ip().'|'.mb_strtolower((string) $request->input('email')))->response($tooMany),
                Limit::perMinute(20)->by('password-reset-ip:'.$request->ip())->response($tooMany),
            ];
        });
    }
}
