<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mecánicas como documento de diseño: icono, acciones jugables, restricciones, conflicto
 * y vínculos con las escenas y los personajes implicados.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mechanics', function (Blueprint $table) {
            $table->string('icon', 30)->default('footsteps')->after('kind');
            $table->text('playable_actions')->nullable()->after('narrative_effect');
            $table->text('restrictions')->nullable()->after('playable_actions');
            $table->string('conflict', 500)->nullable()->after('restrictions');
        });

        Schema::create('mechanic_scene', function (Blueprint $table) {
            $table->foreignId('mechanic_id')->constrained()->cascadeOnDelete();
            $table->foreignId('scene_id')->constrained()->cascadeOnDelete();
            $table->primary(['mechanic_id', 'scene_id']);
        });

        Schema::create('mechanic_character', function (Blueprint $table) {
            $table->foreignId('mechanic_id')->constrained()->cascadeOnDelete();
            $table->foreignId('character_id')->constrained()->cascadeOnDelete();
            $table->primary(['mechanic_id', 'character_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mechanic_character');
        Schema::dropIfExists('mechanic_scene');

        Schema::table('mechanics', function (Blueprint $table) {
            $table->dropColumn(['icon', 'playable_actions', 'restrictions', 'conflict']);
        });
    }
};
