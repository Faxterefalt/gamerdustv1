<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dialogue_nodes', function (Blueprint $table) {
            $table->string('title')->nullable()->after('node_key');
            $table->double('pos_x')->nullable()->after('trigger_condition');
            $table->double('pos_y')->nullable()->after('pos_x');
        });

        Schema::table('dialogue_options', function (Blueprint $table) {
            $table->string('source_ref')->nullable()->after('required_condition');
            $table->unique(['dialogue_node_id', 'source_ref'], 'dialogue_options_node_source_ref_unique');
        });
    }

    public function down(): void
    {
        Schema::table('dialogue_options', function (Blueprint $table) {
            $table->dropUnique('dialogue_options_node_source_ref_unique');
            $table->dropColumn('source_ref');
        });

        Schema::table('dialogue_nodes', function (Blueprint $table) {
            $table->dropColumn(['title', 'pos_x', 'pos_y']);
        });
    }
};
