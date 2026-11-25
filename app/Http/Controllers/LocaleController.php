<?php

namespace App\Http\Controllers;

use App\Http\Middleware\SetLocale;
use Illuminate\Http\RedirectResponse;

class LocaleController extends Controller
{
    /**
     * Guarda el idioma de la interfaz en una cookie y vuelve a la página anterior.
     */
    public function __invoke(string $locale): RedirectResponse
    {
        abort_unless(in_array($locale, config('app.supported_locales'), true), 404);

        return back()->withCookie(cookie()->forever(SetLocale::COOKIE, $locale));
    }
}
