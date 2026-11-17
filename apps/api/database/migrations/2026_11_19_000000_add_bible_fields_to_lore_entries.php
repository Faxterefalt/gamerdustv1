<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fichas de la Biblia Narrativa para lugares y reglas del mundo (entradas de lore de tipo
 * "location" y "rule"): campos propios de cada ficha y sus vínculos narrativos.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lore_entries', function (Blueprint $table) {
            // Lugar: tipo (interior, ciudad...). Regla: categoría (sociedad, magia...).
            $table->string('subtype', 30)->nullable()->after('type');
            // Jerarquía de lugares: un lugar dentro de otro.
            $table->foreignId('parent_id')->nullable()->after('subtype')->constrained('lore_entries')->nullOnDelete();
            // Concept art o mapa (disco privado, se sirve tras autorizar).
            $table->string('image_path')->nullable()->after('emotional_tone');
            // Lugar
            $table->text('access')->nullable()->after('image_path');
            // Regla
            $table->string('statement', 500)->nullable()->after('access');
            $table->string('rigidity', 20)->nullable()->after('statement');
            $table->string('scope', 20)->nullable()->after('rigidity');
            $table->text('origin')->nullable()->after('scope');
            $table->text('consequence')->nullable()->after('origin');
            $table->text('exceptions')->nullable()->after('consequence');
        });

        // Personajes de una ficha; en las reglas, `role` indica si la rompen o la imponen.
        Schema::create('character_lore_entry', function (Blueprint $table) {
            $table->foreignId('lore_entry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('character_id')->constrained()->cascadeOnDelete();
            $table->string('role', 20)->nullable();
            $table->primary(['lore_entry_id', 'character_id']);
        });

        // Escenas que ponen a prueba una regla (los lugares usan scenes.location_id).
        Schema::create('lore_entry_scene', function (Blueprint $table) {
            $table->foreignId('lore_entry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('scene_id')->constrained()->cascadeOnDelete();
            $table->primary(['lore_entry_id', 'scene_id']);
        });

        Schema::create('lore_entry_mechanic', function (Blueprint $table) {
            $table->foreignId('lore_entry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('mechanic_id')->constrained()->cascadeOnDelete();
            $table->primary(['lore_entry_id', 'mechanic_id']);
        });

        // Vínculos simétricos entre entradas (lugar ↔ regla, lugar ↔ facción...): se guardan en ambos sentidos.
        Schema::create('lore_entry_links', function (Blueprint $table) {
            $table->foreignId('lore_entry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('linked_id')->constrained('lore_entries')->cascadeOnDelete();
            $table->primary(['lore_entry_id', 'linked_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lore_entry_links');
        Schema::dropIfExists('lore_entry_mechanic');
        Schema::dropIfExists('lore_entry_scene');
        Schema::dropIfExists('character_lore_entry');

        Schema::table('lore_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parent_id');
            $table->dropColumn(['subtype', 'image_path', 'access', 'statement', 'rigidity', 'scope', 'origin', 'consequence', 'exceptions']);
        });
    }
};
