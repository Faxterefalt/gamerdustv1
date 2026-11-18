<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Recuperar contraseña (HU 1) con el broker estándar de Laravel.
 *
 * Los mensajes son genéricos: nunca se revela si un correo tiene cuenta. El envío está limitado
 * por la ruta (throttle) y por el propio broker (un enlace por minuto y usuario).
 */
class PasswordResetController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/ForgotPassword');
    }

    public function store(ForgotPasswordRequest $request): RedirectResponse
    {
        // El resultado (enviado, usuario inexistente o limitado) no cambia la respuesta.
        Password::sendResetLink($request->only('email'));

        return back()->with('success', __('If an account exists for that email, we have sent a link to reset the password. Check your inbox.'));
    }

    public function edit(Request $request, string $token): Response
    {
        return Inertia::render('Auth/ResetPassword', [
            'token' => $token,
            'email' => (string) $request->query('email', ''),
        ]);
    }

    public function update(ResetPasswordRequest $request): RedirectResponse
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            // Token inválido, caducado o correo sin cuenta: el mismo mensaje en todos los casos.
            return back()
                ->withErrors(['email' => __('This password reset link is invalid or has expired. Request a new one.')])
                ->onlyInput('email');
        }

        return redirect()->route('login')->with('success', __('Your password has been reset. You can log in now.'));
    }
}
