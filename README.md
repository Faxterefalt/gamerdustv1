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

Requisitos: PHP 8.4+, Composer, Node 22+ y MySQL.

```
composer install
copy .env.example .env   # si no existe, usa el .env actual
php artisan key:generate
php artisan migrate
npm install
```

En dos terminales en la raíz del repositorio:

```
php artisan serve
npm run dev
```

Con Laragon, apunta el host virtual a `public/` (`<repositorio>/public`).

Pruebas: `php artisan test`, `npm run test:js` y `npm run test:e2e` (ver [tests/e2e/README.md](tests/e2e/README.md)). Producción: [docs/despliegue.md](docs/despliegue.md).
