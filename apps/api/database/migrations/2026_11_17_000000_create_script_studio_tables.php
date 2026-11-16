<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Estudio de guion: bloques de guion por escena, actos, referencias a personajes/ubicaciones,
 * historial de versiones, comentarios y mecánicas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scenes', function (Blueprint $table) {
            $table->string('act', 100)->nullable()->after('title');
            // Lista de bloques [{id, kind, text}] (ver ScriptController::KINDS).
            $table->json('script')->nullable()->after('consequence');
            // Ubicación = entrada de lore (normalmente de tipo "location").
            $table->foreignId('location_id')->nullable()->after('script')->constrained('lore_entries')->nullOnDelete();
        });

        Schema::create('character_scene', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scene_id')->constrained()->cascadeOnDelete();
            $table->foreignId('character_id')->constrained()->cascadeOnDelete();
            $table->unique(['scene_id', 'character_id']);
        });

        Schema::create('scene_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scene_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->json('script');
            $table->json('character_ids');
            // Sin FK: la ubicación puede haberse borrado; se comprueba al restaurar.
            $table->unsignedBigInteger('location_id')->nullable();
            $table->timestamps();
        });

        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('scene_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->text('text');
            $table->timestamps();
        });

        Schema::create('mechanics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('title', 100);
            $table->string('kind', 30);
            $table->text('description')->nullable();
            $table->string('activation', 300)->nullable();
            $table->text('narrative_effect')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mechanics');
        Schema::dropIfExists('comments');
        Schema::dropIfExists('scene_versions');
        Schema::dropIfExists('character_scene');

        Schema::table('scenes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('location_id');
            $table->dropColumn(['act', 'script']);
        });
    }
};
