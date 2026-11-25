<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private const GENERIC = 'Si existe una cuenta con ese correo, te hemos enviado un enlace para restablecer la contraseña. Revisa tu bandeja de entrada.';

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.locale' => 'es']);
    }

    public function test_las_paginas_de_recuperacion_son_inertia_y_solo_para_invitados(): void
    {
        $this->get('/forgot-password')->assertOk()->assertInertia(fn ($page) => $page->component('Auth/ForgotPassword', false));
        $this->get('/reset-password/abc?email=ana@example.com')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Auth/ResetPassword', false)->where('token', 'abc')->where('email', 'ana@example.com'));

        $this->actingAs(User::factory()->create())->get('/forgot-password')->assertRedirect();
    }

    public function test_envia_el_enlace_con_un_mensaje_generico(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'ana@example.com']);

        $this->from('/forgot-password')->post('/forgot-password', ['email' => 'ana@example.com'])
            ->assertRedirect('/forgot-password')
            ->assertSessionHas('success', self::GENERIC);

        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user) {
            // El correo enlaza a la página de restablecer de la app.
            $url = $notification->toMail($user)->actionUrl;

            return str_contains($url, '/reset-password/'.$notification->token) && str_contains($url, 'email=ana%40example.com');
        });
    }

    public function test_un_correo_sin_cuenta_recibe_la_misma_respuesta(): void
    {
        Notification::fake();

        $this->from('/forgot-password')->post('/forgot-password', ['email' => 'nadie@example.com'])
            ->assertRedirect('/forgot-password')
            ->assertSessionHas('success', self::GENERIC)
            ->assertSessionHasNoErrors();

        Notification::assertNothingSent();
    }

    public function test_restablece_la_contrasena_con_un_token_valido_y_el_token_no_se_reutiliza(): void
    {
        $user = User::factory()->create(['email' => 'ana@example.com']);
        $token = Password::createToken($user);

        $this->post('/reset-password', [
            'token' => $token,
            'email' => 'ana@example.com',
            'password' => 'nueva-clave-segura',
            'password_confirmation' => 'nueva-clave-segura',
        ])->assertRedirect('/login')->assertSessionHas('success');

        $this->assertTrue(Hash::check('nueva-clave-segura', $user->fresh()->password));
        $this->post('/login', ['email' => 'ana@example.com', 'password' => 'nueva-clave-segura'])->assertRedirect('/projects');

        // El mismo enlace ya no sirve.
        auth()->logout();
        $this->from('/reset-password/'.$token)->post('/reset-password', [
            'token' => $token,
            'email' => 'ana@example.com',
            'password' => 'otra-clave-segura',
            'password_confirmation' => 'otra-clave-segura',
        ])->assertRedirect('/reset-password/'.$token)->assertSessionHasErrors('email');
    }

    public function test_token_invalido_o_correo_inexistente_dan_el_mismo_error(): void
    {
        User::factory()->create(['email' => 'ana@example.com']);
        $payload = ['token' => 'falso', 'password' => 'nueva-clave-segura', 'password_confirmation' => 'nueva-clave-segura'];

        $first = $this->from('/reset-password/falso')->post('/reset-password', [...$payload, 'email' => 'ana@example.com']);
        $second = $this->from('/reset-password/falso')->post('/reset-password', [...$payload, 'email' => 'nadie@example.com']);

        $message = 'Este enlace para restablecer la contraseña no es válido o ha caducado. Solicita uno nuevo.';
        $first->assertSessionHasErrors(['email' => $message]);
        $second->assertSessionHasErrors(['email' => $message]);
    }

    public function test_la_contrasena_nueva_se_valida(): void
    {
        $this->from('/reset-password/x')->post('/reset-password', [
            'token' => 'x',
            'email' => 'no-es-un-correo',
            'password' => 'a',
            'password_confirmation' => 'b',
        ])->assertSessionHasErrors(['email', 'password']);
    }

    public function test_el_envio_esta_limitado_por_minuto(): void
    {
        Notification::fake();

        for ($i = 0; $i < 5; $i++) {
            $this->from('/forgot-password')->post('/forgot-password', ['email' => 'ana@example.com'])->assertSessionHasNoErrors();
        }

        $this->from('/forgot-password')->post('/forgot-password', ['email' => 'ana@example.com'])
            ->assertRedirect('/forgot-password')
            ->assertSessionHasErrors(['email' => 'Espera un momento antes de volver a intentarlo.']);
    }

    public function test_el_correo_lleva_el_enlace_y_va_traducido(): void
    {
        User::factory()->create(['email' => 'ana@example.com']);

        $this->post('/forgot-password', ['email' => 'ana@example.com'])->assertSessionHas('success');

        $messages = Mail::mailer('array')->getSymfonyTransport()->messages();
        $this->assertCount(1, $messages);
        $body = $messages[0]->getOriginalMessage()->getHtmlBody();
        $this->assertStringContainsString('Restablecer contraseña', $body);
        $this->assertStringContainsString('/reset-password/', $body);
        $this->assertSame('Restablece tu contraseña', $messages[0]->getOriginalMessage()->getSubject());
    }
}
