<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * El idioma del proyecto pasa de un nombre visible ("Español" / "English") a un código de locale ("es" / "en").
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('projects')->whereIn('language', ['English', 'Inglés', 'Ingles'])->update(['language' => 'en']);
        DB::table('projects')->where('language', '!=', 'en')->update(['language' => 'es']);

        Schema::table('projects', function (Blueprint $table) {
            $table->string('language')->default('es')->change();
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('language')->default('Español')->change();
        });

        DB::table('projects')->where('language', 'en')->update(['language' => 'English']);
        DB::table('projects')->where('language', 'es')->update(['language' => 'Español']);
    }
};
