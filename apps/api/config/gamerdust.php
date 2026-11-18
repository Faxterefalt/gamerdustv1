<?php

/*
 * Configuración de la asistencia narrativa con IA.
 * Es la única fuente de verdad de umbrales y centroides: el frontend los recibe por props.
 */

return [

    'validation' => [
        // Estimación de páginas del guion: palabras de los bloques de todas las escenas / este valor.
        'words_per_page' => 250,
    ],

    'ai' => [
        // groq | keywords. Sin GROQ_API_KEY se usa siempre el análisis por palabras clave.
        'driver' => env('GAMERDUST_AI_DRIVER') ?: (env('GROQ_API_KEY') ? 'groq' : 'keywords'),
        'temperature' => 0.3,
        'reasoning_effort' => 'low',
        // Incluye los tokens de razonamiento de los modelos gpt-oss.
        'max_completion_tokens' => (int) env('GAMERDUST_AI_MAX_TOKENS', 2000),
        // Presupuesto por petición (plan gratuito: ~8.000 TPM por modelo).
        'max_scene_words' => 1800,
        'max_context_items' => 8,
        // Llamadas de IA por usuario y minuto (RateLimiter "ai").
        'rate_limit_per_minute' => 10,
    ],

    'emotion' => [
        // Cambio abrupto: max(|Δv|, |Δa|, |Δd|) por encima de este valor.
        'abrupt_threshold' => 0.40,

        // Activación que corresponde a la intensidad elegida por el autor.
        'intensity' => ['low' => 0.25, 'medium' => 0.50, 'high' => 0.80],

        // Traducción a etiquetas narrativas: [límite superior exclusivo, clave i18n]; null = resto.
        'labels' => [
            'tone' => [[0.2, 'Very negative'], [0.4, 'Negative'], [0.6, 'Neutral'], [0.8, 'Positive'], [null, 'Very positive']],
            'tension' => [[0.35, 'Low'], [0.65, 'Medium'], [null, 'High']],
            'control' => [[0.35, 'Vulnerable'], [0.65, 'On equal footing'], [null, 'In control']],
        ],

        /*
         * Centroides v/a/d (0-1). Valores de diseño aproximados a partir del modelo PAD
         * de Mehrabian y del circumplejo de Russell; son ajustables.
         */
        'emotions' => [
            'joy' => ['v' => 0.85, 'a' => 0.65, 'd' => 0.65, 'color' => '#f2c94c'],
            'hope' => ['v' => 0.75, 'a' => 0.50, 'd' => 0.55, 'color' => '#9bd67b'],
            'tenderness' => ['v' => 0.88, 'a' => 0.40, 'd' => 0.55, 'color' => '#f0a6c4'],
            'calm' => ['v' => 0.72, 'a' => 0.20, 'd' => 0.60, 'color' => '#6cc4c8'],
            'surprise' => ['v' => 0.60, 'a' => 0.85, 'd' => 0.45, 'color' => '#c592e8'],
            'neutral' => ['v' => 0.50, 'a' => 0.40, 'd' => 0.50, 'color' => '#9ba69a'],
            'anxiety' => ['v' => 0.25, 'a' => 0.75, 'd' => 0.30, 'color' => '#e9a25b'],
            'fear' => ['v' => 0.10, 'a' => 0.85, 'd' => 0.15, 'color' => '#8a80d8'],
            'sadness' => ['v' => 0.15, 'a' => 0.25, 'd' => 0.25, 'color' => '#5d90da'],
            'guilt' => ['v' => 0.15, 'a' => 0.45, 'd' => 0.20, 'color' => '#a98c6b'],
            'anger' => ['v' => 0.10, 'a' => 0.85, 'd' => 0.75, 'color' => '#e5544c'],
            'disgust' => ['v' => 0.10, 'a' => 0.55, 'd' => 0.60, 'color' => '#86a84e'],
        ],

        // Claves del análisis simulado antiguo que no están en la lista anterior.
        'legacy' => ['tension' => 'anxiety'],
    ],

];
