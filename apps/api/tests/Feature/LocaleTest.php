<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LocaleTest extends TestCase
{
    use RefreshDatabase;

    public function test_la_interfaz_esta_en_espanol_por_defecto(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('<html lang="es">', false);
    }

    public function test_se_puede_cambiar_el_idioma_y_se_recuerda_en_una_cookie(): void
    {
        $this->from('/login')
            ->get('/locale/en')
            ->assertRedirect('/login')
            ->assertCookie('locale', 'en');

        $this->withCookie('locale', 'en')
            ->get('/')
            ->assertSee('<html lang="en">', false);
    }

    public function test_un_idioma_no_soportado_devuelve_404_y_una_cookie_invalida_se_ignora(): void
    {
        $this->get('/locale/fr')->assertNotFound();

        $this->withCookie('locale', 'fr')
            ->get('/')
            ->assertSee('<html lang="es">', false);
    }

    public function test_los_mensajes_del_servidor_siguen_el_idioma_elegido(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/projects', [])
            ->assertSessionHasErrors(['title' => 'El campo título es obligatorio.']);

        $payload = ['title' => 'Dustfall', 'game_genre' => 'RPG', 'language' => 'en', 'narrative_type' => 'linear'];

        $this->actingAs($user)->post('/projects', $payload)->assertSessionHas('success', 'Proyecto narrativo creado.');

        // La cookie se mantiene para el resto de peticiones del test.
        $this->withCookie('locale', 'en');

        $this->actingAs($user)
            ->post('/projects', [])
            ->assertSessionHasErrors(['title' => 'The title field is required.']);

        $this->actingAs($user)->post('/projects', $payload)->assertSessionHas('success', 'Narrative project created.');
    }
}
