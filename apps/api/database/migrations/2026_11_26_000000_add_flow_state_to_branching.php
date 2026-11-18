<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ramificación con estado (HU 18, 19 y 20): inicio y finales declarados, variables del proyecto,
 * condiciones y efectos estructurados en las opciones y vínculos de los nodos con la Biblia.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dialogue_nodes', function (Blueprint $table) {
            // Un único inicio por proyecto (lo garantiza BranchingNodeService); sin marcar, el de menor id.
            $table->boolean('is_start')->default(false)->after('trigger_condition');
            $table->boolean('is_ending')->default(false)->after('is_start');
        });

        Schema::create('branching_variables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('key', 64);
            // bool | number
            $table->string('type', 10);
            $table->json('initial_value');
            $table->string('description', 500)->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'key']);
        });

        Schema::table('dialogue_options', function (Blueprint $table) {
            // {var, op, value}; required_condition y consequence quedan como notas del autor.
            $table->json('condition')->nullable()->after('required_condition');
            // [{var, op: set|add|sub, value}]
            $table->json('effects')->nullable()->after('condition');
        });

        Schema::create('dialogue_node_lore_entry', function (Blueprint $table) {
            $table->foreignId('dialogue_node_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lore_entry_id')->constrained()->cascadeOnDelete();
            $table->primary(['dialogue_node_id', 'lore_entry_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dialogue_node_lore_entry');

        Schema::table('dialogue_options', function (Blueprint $table) {
            $table->dropColumn(['condition', 'effects']);
        });

        Schema::dropIfExists('branching_variables');

        Schema::table('dialogue_nodes', function (Blueprint $table) {
            $table->dropColumn(['is_start', 'is_ending']);
        });
    }
};
