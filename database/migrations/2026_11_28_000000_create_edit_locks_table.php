<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Edición simultánea (HU 26, opción a): bloqueo blando por escena o nodo. Solo informa de quién
 * está editando; caduca si el editor deja de enviar el latido. El 409 sigue protegiendo el guardado.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('edit_locks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            // Sin morphs(): el índice único de abajo ya cubre la búsqueda por elemento.
            $table->string('lockable_type');
            $table->unsignedBigInteger('lockable_id');
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('expires_at')->index();
            $table->timestamps();

            $table->unique(['lockable_type', 'lockable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('edit_locks');
    }
};
