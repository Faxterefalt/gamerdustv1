# Gamerdust

Aplicación web de asistencia al diseño narrativo: proyectos, lore, personajes, escenas y diálogos, con análisis emocional y validación de coherencia.

Construida con [Laravel](https://laravel.com) 13 (PHP) y un frontend React 19 / TypeScript servido con Inertia, Vite y Tailwind. La raíz del repositorio es la propia app Laravel.

## Estructura

```
app/          Lógica de la aplicación (Http, Models, Policies, Services/<Dominio>, Contracts, Support)
bootstrap/    Arranque de Laravel (middleware, excepciones, proveedores)
config/       Configuración (gamerdust.php, services.php → groq, ...)
database/     Migraciones, factories y seeders (CumbreMudaSeeder: proyecto de demostración)
lang/         Traducciones (es.json + lang/{en,es}/*.php)
public/       Document root del servidor web
resources/    Frontend (js/, css/) y vistas Blade (views/)
routes/       Rutas web y de consola
storage/      Archivos generados: logs, caché, sesiones, concept art (app/private)
tests/        PHPUnit (Feature, Unit), JS (js/) y pruebas de navegador (e2e/)
docs/         Arquitectura, modelo de IA emocional, despliegue y diseño del motor Python previsto
```

Frontend (`resources/js`): `app/` (arranque), `layouts/`, `features/<módulo>/{pages,components}` y `shared/`.

## Instalación y ejecución

Requisitos: PHP 8.4+ en la línea de comandos (en Laragon, la de `laragon/bin/php/php-8.5…`), Composer, Node 22+ y MySQL (el de Laragon o `docker compose up -d`).

**Primera vez**, en la raíz del repositorio:

1. Crea `.env` a mano: no existe `.env.example`, así que `composer setup` no sirve en una instalación nueva. Hay una plantilla local en la sección 10 del [cuaderno de arquitectura](docs/architecture/Gamerdust_Documentacion.ipynb) (MySQL `gamerdust`, `MAIL_MAILER=log`, `GROQ_API_KEY` opcional).
2. Instala y prepara:

```
composer install
php artisan key:generate      # solo la primera vez
php artisan migrate --seed    # datos de ejemplo: test@example.com / password
npm install
npm run build
```

**Para arrancar:**

- **Con Laragon:** apunta el host virtual a `public/` (`<repositorio>/public`, nunca a la raíz), pulsa *Start All* y abre `http://gamerdustv1.test`. Deja `npm run dev` abierto solo si editas el frontend.
- **Sin Laragon**, en dos terminales: `php artisan serve` y `npm run dev`, y abre `http://127.0.0.1:8000` (no el puerto 5173 de Vite).
- `composer dev` lo arranca todo junto, pero solo en Linux y macOS: Pail necesita la extensión `pcntl`, que no existe en Windows.

Pruebas: `APP_LOCALE=es php artisan test` (requiere `npm run build`), `npm run test:js` y `npm run test:e2e` (ver [tests/e2e/README.md](tests/e2e/README.md)). Producción: [docs/despliegue.md](docs/despliegue.md).
