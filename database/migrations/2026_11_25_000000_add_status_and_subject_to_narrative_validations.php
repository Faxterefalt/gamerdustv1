<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Las alertas pasan de `resolved` (bool) a `status` (pending | resolved | dismissed),
 * ganan el elemento afectado (subject) y una huella para no recrear las ya cerradas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('narrative_validations', function (Blueprint $table) {
            $table->string('status', 20)->default('pending')->after('recommendation')->index();
            $table->nullableMorphs('subject');
            // sha256 de tipo + elemento afectado + causa; null = la causa ya desapareció (histórico).
            $table->char('fingerprint', 64)->nullable()->after('status')->index();
        });

        DB::table('narrative_validations')->where('resolved', true)->update(['status' => 'resolved']);

        Schema::table('narrative_validations', function (Blueprint $table) {
            $table->dropIndex(['resolved']);
            $table->dropColumn('resolved');
        });
    }

    public function down(): void
    {
        Schema::table('narrative_validations', function (Blueprint $table) {
            $table->boolean('resolved')->default(false)->index();
        });

        DB::table('narrative_validations')->where('status', '!=', 'pending')->update(['resolved' => true]);

        Schema::table('narrative_validations', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['fingerprint']);
            $table->dropMorphs('subject');
            $table->dropColumn(['status', 'fingerprint']);
        });
    }
};
