<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

/**
 * La imagen (concept art) pasa de las fichas de lugar a las de personaje, que además
 * ganan "límites y excepciones" (lo que el personaje nunca haría y cuándo sí).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('characters', function (Blueprint $table) {
            $table->text('limits')->nullable()->after('voice_notes');
            $table->string('image_path')->nullable()->after('limits');
        });

        // Las imágenes que ya se hubieran subido a lugares dejan de usarse: se borran del disco privado.
        $paths = DB::table('lore_entries')->whereNotNull('image_path')->pluck('image_path')->all();
        if ($paths) {
            Storage::disk('local')->delete($paths);
        }

        Schema::table('lore_entries', function (Blueprint $table) {
            $table->dropColumn('image_path');
        });
    }

    public function down(): void
    {
        Schema::table('lore_entries', function (Blueprint $table) {
            $table->string('image_path')->nullable()->after('emotional_tone');
        });

        Schema::table('characters', function (Blueprint $table) {
            $table->dropColumn(['limits', 'image_path']);
        });
    }
};
