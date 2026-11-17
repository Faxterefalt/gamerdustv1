<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Valoraciones 👍/👎 del autor sobre las propuestas de la IA (evaluación del OE4).
     * Cada voto apunta a un análisis de escena (sugerencia n.º item_index) o a una generación.
     */
    public function up(): void
    {
        Schema::create('ai_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ai_generation_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('emotional_analysis_id')->nullable()->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('item_index')->default(0);
            $table->boolean('useful');
            $table->timestamps();

            $table->index(['emotional_analysis_id', 'user_id']);
            $table->index(['ai_generation_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_feedback');
    }
};
