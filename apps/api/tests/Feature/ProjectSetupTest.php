<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectSetupTest extends TestCase
{
    use RefreshDatabase;

    private array $payload = [
        'title' => 'Dustfall Protocol',
        'game_genre' => 'RPG',
        'language' => 'es',
        'narrative_type' => 'balanced',
        'premise' => 'Una archivista debe reconstruir la memoria de una colonia.',
    ];

    public function test_creates_project_with_five_fields_and_ignores_extras(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/projects', $this->payload + ['description' => 'x'])->assertRedirect();

        $project = $user->projects()->firstOrFail();
        $this->assertSame('RPG', $project->game_genre);
        $this->assertSame('balanced', $project->narrative_type);
        $this->assertSame($this->payload['premise'], $project->premise);
        $this->assertNull($project->description);
    }

    public function test_requires_mandatory_fields(): void
    {
        $this->actingAs(User::factory()->create())
            ->post('/projects', ['premise' => 'x'])
            ->assertSessionHasErrors(['title', 'game_genre', 'language', 'narrative_type']);
    }

    public function test_updates_general_data_and_narrative_type(): void
    {
        $user = User::factory()->create();
        $project = $user->projects()->create($this->payload);

        $this->actingAs($user)->put("/projects/{$project->id}", [
            ...$this->payload, 'narrative_type' => 'linear', 'language' => 'en',
        ])->assertSessionHasNoErrors();

        $project->refresh();
        $this->assertSame('linear', $project->narrative_type);
        $this->assertFalse($project->branching_enabled);
        $this->assertSame('en', $project->language);
    }

    public function test_narrative_setup_shares_premise_and_keeps_general_data(): void
    {
        $user = User::factory()->create();
        $project = $user->projects()->create($this->payload);

        $this->actingAs($user)->post("/projects/{$project->id}/constraints", [
            'premise' => 'Nueva premisa',
            'central_theme' => 'memoria',
            'central_conflict' => null,
            'player_objective' => null,
            'setting' => 'Colonia',
            'expected_outcome' => 'Abierto',
        ])->assertSessionHasNoErrors();

        $project->refresh();
        $this->assertSame('Nueva premisa', $project->premise);
        $this->assertSame('balanced', $project->narrative_type);
        $this->assertSame('RPG', $project->game_genre);
        $this->assertSame('Abierto', $project->constraint->expected_outcome);
    }
}
