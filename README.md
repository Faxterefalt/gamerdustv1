# Gamerdust

Aplicación web de asistencia al diseño narrativo: proyectos, lore, personajes, escenas y diálogos, con análisis emocional y validación de coherencia.

## Estructura

```
apps/
├── api/               Laravel (API, reglas de negocio, MySQL) + frontend React con Inertia
├── web/               Reservado para la interfaz React como SPA independiente
└── narrative-engine/  Motor de análisis en Python (esqueleto, pendiente)
docs/                  Requerimientos, backlog, arquitectura, mockups y pruebas
tests/e2e/             Pruebas de recorridos completos
```

Frontend (`apps/api/resources/js`): `app/` (arranque), `layouts/`, `features/<módulo>/{pages,components}` y `shared/`.

## Instalación y ejecución

Requisitos: PHP 8.4+, Composer, Node 22+ y MySQL.

```
cd apps/api
composer install
copy .env.example .env   # si no existe, usa el .env actual
php artisan key:generate
php artisan migrate
npm install
```

En dos terminales dentro de `apps/api`:

```
php artisan serve
npm run dev
```

Con Laragon, apunta el host virtual a `apps/api/public`.
