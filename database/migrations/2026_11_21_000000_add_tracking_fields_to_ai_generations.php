<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Registro de cada llamada a la IA (evaluación del OE4). Nunca se guarda la API key.
     */
    public function up(): void
    {
        Schema::table('ai_generations', function (Blueprint $table) {
            // ok | fallback | degraded | error
            $table->string('status', 20)->default('ok')->after('model')->index();
            $table->unsignedInteger('prompt_tokens')->nullable()->after('status');
            $table->unsignedInteger('completion_tokens')->nullable()->after('prompt_tokens');
            $table->unsignedInteger('total_tokens')->nullable()->after('completion_tokens');
            $table->unsignedInteger('latency_ms')->nullable()->after('total_tokens');
            $table->char('input_hash', 64)->nullable()->after('latency_ms')->index();
            // Causa breve del fallo (estado HTTP o código), sin el cuerpo de la petición.
            $table->string('error')->nullable()->after('input_hash');
        });

        // Una llamada fallida no tiene respuesta.
        Schema::table('ai_generations', function (Blueprint $table) {
            $table->longText('prompt')->nullable()->change();
            $table->json('response')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('ai_generations', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['input_hash']);
            $table->dropColumn(['status', 'prompt_tokens', 'completion_tokens', 'total_tokens', 'latency_ms', 'input_hash', 'error']);
        });
    }
};
