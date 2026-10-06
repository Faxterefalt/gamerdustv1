<?php

namespace Database\Seeders;

use App\Models\DialogueNode;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $user = User::query()->firstOrCreate([
            'email' => 'test@example.com',
        ], [
            'name' => 'Test User',
            'password' => Hash::make('password'),
        ]);

        $user->forceFill(['email_verified_at' => $user->email_verified_at ?? now()])->save();

        $project = $user->projects()->firstOrCreate([
            'title' => 'Dustfall Protocol',
        ], [
            'description' => 'Proyecto de ejemplo para validar la estructura inicial de Gamerdust.',
            'game_genre' => 'Narrative adventure',
            'narrative_type' => 'balanced_narrative',
            'premise' => 'Una archivista debe reconstruir la memoria de una colonia antes de que su mito fundador se derrumbe.',
            'central_conflict' => 'La verdad historica puede salvar a la colonia, pero tambien destruir su identidad compartida.',
            'target_audience' => 'Jugadores interesados en misterio, decisiones morales y worldbuilding.',
            'status' => 'in_progress',
        ]);

        $project->constraint()->updateOrCreate([
            'project_id' => $project->id,
        ], [
            'main_emotional_tone' => 'Melancolia esperanzada',
            'dominant_emotion' => 'tension',
            'secondary_emotions' => ['nostalgia', 'curiosidad'],
            'world_type' => 'Colonia aislada',
            'player_role' => 'Archivista',
            'branching_level' => 'moderado',
            'required_elements' => ['memoria fragmentada', 'decision moral'],
            'forbidden_elements' => ['solucion unica perfecta'],
            'creative_notes' => 'Mantener a la IA como asistente de revision, no como autora final.',
        ]);

        $project->loreEntries()->firstOrCreate([
            'title' => 'El Polvo de Vigilia',
        ], [
            'type' => 'concept',
            'description' => 'Mineral que conserva ecos emocionales de eventos intensos.',
            'narrative_function' => 'Permite que el jugador lea capas emocionales del pasado.',
            'emotional_tone' => 'asombro inquietante',
        ]);

        $character = $project->characters()->firstOrCreate([
            'name' => 'Mara Venn',
        ], [
            'role' => 'Protagonista',
            'archetype' => 'Archivista renuente',
            'background' => 'Custodia expedientes incompletos de la primera expedicion.',
            'personality' => 'Metodica, empatica y desconfiada de relatos oficiales.',
            'speech_style' => 'Precisa, con humor seco cuando esta nerviosa.',
            'motivation' => 'Proteger a su comunidad sin borrar la verdad.',
            'fear' => 'Convertirse en otra voz del encubrimiento.',
            'desire' => 'Encontrar una memoria que no dependa de propaganda.',
            'emotional_arc' => 'De obediencia cautelosa a responsabilidad activa.',
        ]);

        $scene = $project->scenes()->firstOrCreate([
            'title' => 'Archivo bajo ceniza',
        ], [
            'order' => 1,
            'summary' => 'Mara descubre una grabacion que contradice el mito fundador de la colonia.',
            'conflict' => 'Debe decidir si reporta el hallazgo o lo investiga en secreto.',
            'expected_emotion' => 'tension',
            'interest_level' => 7,
            'scene_type' => 'investigacion',
            'player_decision' => 'Reportar la cinta o ocultarla temporalmente.',
            'consequence' => 'La confianza de la faccion archivista cambia segun la decision.',
            'estimated_cost' => 'medium',
        ]);

        /** @var DialogueNode $dialogue */
        $dialogue = $project->dialogueNodes()->firstOrCreate([
            'node_key' => 'archive_intro_001',
        ], [
            'scene_id' => $scene->id,
            'character_id' => $character->id,
            'dialogue_type' => 'interactive_no_branch',
            'text' => 'La cinta no deberia existir. Si esto es real, todo el archivo esta construido sobre una omision.',
            'emotional_tone' => 'tension',
            'trigger_condition' => 'Al inspeccionar la cinta sellada.',
        ]);

        $dialogue->options()->firstOrCreate([
            'player_option' => 'Guardar la cinta y seguir investigando.',
        ], [
            'consequence' => 'Mara gana tiempo, pero aumenta el riesgo de ser descubierta.',
            'required_condition' => null,
        ]);
    }
}
