<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_constraints', function (Blueprint $table) {
            $table->text('expected_outcome')->nullable()->after('player_objective');
        });
    }

    public function down(): void
    {
        Schema::table('project_constraints', function (Blueprint $table) {
            $table->dropColumn('expected_outcome');
        });
    }
};
