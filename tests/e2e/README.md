# Pruebas de navegador (E2E)

Recorren la app real en Chrome headless, controlado con el protocolo DevTools desde Node. **Sin dependencias**: solo Node 22+ (WebSocket y `fetch` nativos), PHP ≥ 8.4 y Google Chrome. Complementan la suite de PHPUnit (`php artisan test`) y los tests de JS (`npm run test:js`): aquí se comprueba lo que solo se ve en un navegador (localStorage, teclado, portapapeles, iframes, dos sesiones a la vez, el HTML exportado abierto sin conexión).

## Ejecutar

Desde `apps/api`:

```bash
npm run test:e2e                          # compila el frontend y ejecuta todo
npm run test:e2e -- --skip-build          # sin "npm run build" (si el build ya está al día)
npm run test:e2e -- --only=script,ai      # solo algunos escenarios
npm run test:e2e -- --keep                # conserva la carpeta temporal (BD, server.log, perfiles)
```

O desde la raíz del repositorio: `node tests/e2e/run.mjs [opciones]`.

| Variable | Para qué | Por defecto |
|---|---|---|
| `PHP_BINARY` | PHP ≥ 8.4. En Laragon: `E:/laragon/bin/php/php-8.5.../php.exe` | `php` |
| `CHROME_PATH` | Ejecutable de Chrome | ruta habitual de cada sistema |
| `E2E_PORT` | Puerto del servidor PHP de prueba | `8765` |
| `E2E_DEBUG_PORT` | Primer puerto de depuración de Chrome | `9400` |

En PowerShell con Laragon:

```powershell
$env:PHP_BINARY = 'E:\laragon\bin\php\php-8.5.11-nts-Win32-vs17-x64\php.exe'; npm run test:e2e
```

## Qué hace el runner

1. Compila el frontend (`npm run build`), porque el servidor sirve `public/build`.
2. Crea una **base SQLite temporal** y ejecuta `migrate:fresh --seed` (proyecto Cumbre Muda, `test@example.com`, `editora@example.com` y `lector@example.com`, todos con `password`). No toca la base de Laragon.
3. Arranca `php -S` con el router de Laravel en `E2E_PORT`, con IA por palabras clave (sin red), `MAIL_MAILER=log` y el log en el `server.log` temporal (no en `storage/logs/laravel.log`).
4. Ejecuta los escenarios **en orden** (comparten la BD) y cada navegador con un perfil propio.
5. Sale con código 1 si alguna comprobación falla y entonces conserva la carpeta temporal para investigar.

Si la configuración está cacheada (`bootstrap/cache/config.php`) se detiene: con la caché Laravel ignora las variables de la prueba. Ejecuta `php artisan config:clear`.

## Escenarios

| Nombre | Historias | Comprueba |
|---|---|---|
| `dialogues` | 18, 19, 22, 23 (criterio 3) | "Probar recorrido" y el HTML exportado abierto desde disco: inicio declarado, la opción con condición aparece solo tras su efecto, Reiniciar vuelve a los valores iniciales, se llega a un final y probar no cambia la BD. |
| `script` | 24, 14, 25, 16 (criterios 5–7) | Borrador en localStorage, recuperar/descartar al volver, indicador con el servidor caído, auto-formato con Enter y MAYÚSCULAS, deshacer, comparar versiones y enlaces de la ficha del personaje a sus nodos. |
| `ai` | 45, 50, 52, 56 (criterio 8) | Análisis del nodo en su panel, avisos de consecuencias y disonancias sin clave de Groq y "Usar como base" en Refinar. |
| `collaboration` | 5, 26 (criterio 11) | Registro, invitación, lista de compartidos, aviso de quién edita, conflicto 409 (Ver cambios / Sobrescribir / Copiar mi versión + Deshacer), lector de solo lectura y miembro retirado sin acceso. |
| `account` | 1, 57 (criterios 9 y 10) | Recuperar contraseña leyendo el enlace del correo en el log y reporte de análisis imprimible sin VAD. Va el último: cambia la contraseña de `test@example.com`. |

## Escribir un escenario

Un archivo en `scenarios/` que exporta `{ name, title, run(ctx) }`, registrado en `SCENARIOS` de `run.mjs`. `ctx` trae `browser()` (abre y conecta un Chrome nuevo; el runner lo cierra), `check(nombre, ok, detalle)`, `fixtures` (ids del proyecto de demostración, ver `lib/app.mjs`) y `app` (URL, log del servidor, HTML exportado). `lib/browser.mjs` tiene los ayudantes: `go`, `waitFor`, `type` (inputs controlados por React), `click(selector, /texto/)`, `login`, `logout`, `status(método, ruta, cuerpo)` y `send` (CDP directo: `Input.*`, `Fetch.*`...).

Busca los textos en español (la app de prueba usa `APP_LOCALE=es`) y espera con `waitFor` en lugar de pausas fijas siempre que puedas.
