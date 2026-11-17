<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Análisis por escena con IA. Las filas sin content_hash son del análisis simulado
        // antiguo (valencia de -1 a 1) y no se mezclan con las nuevas (escala 0-1).
        Schema::table('emotional_analyses', function (Blueprint $table) {
            // keywords | groq (null = análisis simulado antiguo)
            $table->string('source', 20)->nullable()->after('analyzable_id');
            $table->string('model')->nullable()->after('source');
            // Hash del texto y del contexto analizado: si coincide, no se vuelve a llamar a la IA.
            $table->char('content_hash', 64)->nullable()->after('model')->index();
            // Resultado completo (escena, personajes, incoherencias y sugerencias).
            $table->json('result')->nullable()->after('suggestions');
            $table->boolean('truncated')->default(false)->after('result');
            $table->boolean('degraded')->default(false)->after('truncated');
            // Versión del guion analizada (las versiones antiguas se purgan).
            $table->foreignId('scene_version_id')->nullable()->after('degraded')->constrained()->nullOnDelete();
        });

        // Estado emocional de cada personaje en cada escena analizada.
        Schema::create('character_emotional_states', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('character_id')->constrained()->cascadeOnDelete();
            $table->foreignId('scene_id')->constrained()->cascadeOnDelete();
            $table->foreignId('emotional_analysis_id')->constrained()->cascadeOnDelete();
            $table->decimal('v', 4, 3);
            $table->decimal('a', 4, 3);
            $table->decimal('d', 4, 3);
            $table->string('emotion', 30);
            $table->text('evidence')->nullable();
            $table->boolean('abrupt_change')->default(false);
            $table->boolean('change_justified')->nullable();
            $table->text('change_explanation')->nullable();
            $table->boolean('out_of_character')->default(false);
            $table->text('out_of_character_reason')->nullable();
            $table->timestamps();

            // Al reanalizar una escena se sustituyen sus filas.
            $table->unique(['scene_id', 'character_id']);
        });

        // Estado emocional con el que el autor hace empezar al personaje.
        Schema::table('characters', function (Blueprint $table) {
            $table->string('initial_emotion', 30)->nullable()->after('emotional_arc');
            // low | medium | high
            $table->string('initial_intensity', 10)->nullable()->after('initial_emotion');
        });
    }

    public function down(): void
    {
        Schema::table('characters', function (Blueprint $table) {
            $table->dropColumn(['initial_emotion', 'initial_intensity']);
        });

        Schema::dropIfExists('character_emotional_states');

        Schema::table('emotional_analyses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('scene_version_id');
            $table->dropIndex(['content_hash']);
            $table->dropColumn(['source', 'model', 'content_hash', 'result', 'truncated', 'degraded']);
        });
    }
};
