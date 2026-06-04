<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('game_genre')->nullable();
            $table->string('narrative_type')->default('balanced_narrative');
            $table->text('premise')->nullable();
            $table->text('central_conflict')->nullable();
            $table->string('target_audience')->nullable();
            $table->string('status')->default('draft')->index();
            $table->timestamps();
        });

        Schema::create('project_constraints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('main_emotional_tone')->nullable();
            $table->string('dominant_emotion')->nullable();
            $table->json('secondary_emotions')->nullable();
            $table->string('world_type')->nullable();
            $table->string('player_role')->nullable();
            $table->string('branching_level')->nullable();
            $table->json('required_elements')->nullable();
            $table->json('forbidden_elements')->nullable();
            $table->text('creative_notes')->nullable();
            $table->timestamps();
        });

        Schema::create('lore_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('type')->default('concept')->index();
            $table->text('description')->nullable();
            $table->text('narrative_function')->nullable();
            $table->string('emotional_tone')->nullable();
            $table->timestamps();
        });

        Schema::create('characters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('role')->nullable();
            $table->string('archetype')->nullable();
            $table->unsignedInteger('age')->nullable();
            $table->string('gender')->nullable();
            $table->text('background')->nullable();
            $table->text('personality')->nullable();
            $table->text('speech_style')->nullable();
            $table->text('motivation')->nullable();
            $table->text('fear')->nullable();
            $table->text('desire')->nullable();
            $table->text('emotional_arc')->nullable();
            $table->text('visual_description')->nullable();
            $table->text('voice_notes')->nullable();
            $table->timestamps();
        });

        Schema::create('scenes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->unsignedInteger('order')->default(1);
            $table->text('summary')->nullable();
            $table->text('conflict')->nullable();
            $table->string('expected_emotion')->nullable();
            $table->unsignedTinyInteger('interest_level')->nullable();
            $table->string('scene_type')->nullable();
            $table->text('player_decision')->nullable();
            $table->text('consequence')->nullable();
            $table->string('estimated_cost')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'order']);
        });

        Schema::create('dialogue_nodes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('scene_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('character_id')->nullable()->constrained()->nullOnDelete();
            $table->string('node_key');
            $table->string('dialogue_type')->default('ambient')->index();
            $table->text('text');
            $table->string('emotional_tone')->nullable();
            $table->text('trigger_condition')->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'node_key']);
        });

        Schema::create('dialogue_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dialogue_node_id')->constrained()->cascadeOnDelete();
            $table->foreignId('next_dialogue_node_id')->nullable()->constrained('dialogue_nodes')->nullOnDelete();
            $table->text('player_option');
            $table->text('consequence')->nullable();
            $table->text('required_condition')->nullable();
            $table->timestamps();
        });

        Schema::create('emotional_analyses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->nullableMorphs('analyzable');
            $table->longText('input_text');
            $table->string('dominant_emotion');
            $table->decimal('valence', 5, 2)->nullable();
            $table->decimal('arousal', 5, 2)->nullable();
            $table->decimal('dominance', 5, 2)->nullable();
            $table->json('emotion_scores')->nullable();
            $table->text('interpretation')->nullable();
            $table->json('suggestions')->nullable();
            $table->timestamps();
        });

        Schema::create('narrative_validations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('validation_type')->index();
            $table->string('severity')->default('low')->index();
            $table->text('message');
            $table->text('recommendation')->nullable();
            $table->boolean('resolved')->default(false)->index();
            $table->timestamps();
        });

        Schema::create('cost_estimations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->nullableMorphs('costable');
            $table->string('cost_level')->default('low');
            $table->unsignedInteger('cost_score')->default(1);
            $table->json('cost_factors')->nullable();
            $table->text('explanation')->nullable();
            $table->timestamps();
        });

        Schema::create('ai_generations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('generation_type')->index();
            $table->longText('prompt');
            $table->json('response');
            $table->string('model')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_generations');
        Schema::dropIfExists('cost_estimations');
        Schema::dropIfExists('narrative_validations');
        Schema::dropIfExists('emotional_analyses');
        Schema::dropIfExists('dialogue_options');
        Schema::dropIfExists('dialogue_nodes');
        Schema::dropIfExists('scenes');
        Schema::dropIfExists('characters');
        Schema::dropIfExists('lore_entries');
        Schema::dropIfExists('project_constraints');
        Schema::dropIfExists('projects');
    }
};
