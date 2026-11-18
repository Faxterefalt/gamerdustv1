<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Restricciones de producción del proyecto (HU 7), encargo del brief (HU 6) y
 * valores y conflicto interno del personaje (HU 10).
 * Un límite a null significa "sin límite": no genera alertas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_constraints', function (Blueprint $table) {
            $table->text('assignment')->nullable()->after('expected_outcome');
            $table->unsignedInteger('max_characters')->nullable()->after('assignment');
            $table->unsignedInteger('max_pages')->nullable()->after('max_characters');
            // En puntos de coste narrativo (la heurística de NarrativeCostEstimatorService), no en dinero.
            $table->decimal('max_budget', 10, 2)->nullable()->after('max_pages');
            $table->boolean('requires_twist')->default(false)->after('max_budget');
        });

        Schema::table('characters', function (Blueprint $table) {
            $table->text('values')->nullable()->after('motivation');
            $table->text('inner_conflict')->nullable()->after('values');
        });
    }

    public function down(): void
    {
        Schema::table('characters', function (Blueprint $table) {
            $table->dropColumn(['values', 'inner_conflict']);
        });

        Schema::table('project_constraints', function (Blueprint $table) {
            $table->dropColumn(['assignment', 'max_characters', 'max_pages', 'max_budget', 'requires_twist']);
        });
    }
};
