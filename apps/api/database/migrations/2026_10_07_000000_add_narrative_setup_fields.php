<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->boolean('branching_enabled')->default(true)->after('narrative_type');
        });

        Schema::table('project_constraints', function (Blueprint $table) {
            $table->string('narrative_genre')->nullable();
            $table->string('central_theme')->nullable();
            $table->text('setting')->nullable();
            $table->text('player_objective')->nullable();
        });

        DB::table('projects')->where('narrative_type', 'game_story')->update(['narrative_type' => 'linear']);
        DB::table('projects')->where('narrative_type', 'player_story')->update(['narrative_type' => 'branching']);
        DB::table('projects')->where('narrative_type', 'balanced_narrative')->update(['narrative_type' => 'balanced']);
        DB::table('projects')->where('narrative_type', 'linear')->update(['branching_enabled' => false]);

        Schema::table('projects', function (Blueprint $table) {
            $table->string('narrative_type')->default('balanced')->change();
        });
    }

    public function down(): void
    {
        DB::table('projects')->where('narrative_type', 'linear')->update(['narrative_type' => 'game_story']);
        DB::table('projects')->where('narrative_type', 'branching')->update(['narrative_type' => 'player_story']);
        DB::table('projects')->where('narrative_type', 'balanced')->update(['narrative_type' => 'balanced_narrative']);

        Schema::table('projects', function (Blueprint $table) {
            $table->string('narrative_type')->default('balanced_narrative')->change();
            $table->dropColumn('branching_enabled');
        });

        Schema::table('project_constraints', function (Blueprint $table) {
            $table->dropColumn(['narrative_genre', 'central_theme', 'setting', 'player_objective']);
        });
    }
};
