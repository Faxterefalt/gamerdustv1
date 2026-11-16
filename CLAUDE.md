# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Gamerdust es una app web de asistencia al diseño narrativo de videojuegos (proyectos, lore, personajes, escenas, diálogos ramificados, análisis emocional, validación de coherencia y estimación de coste). Los comentarios del código están en español; mantén ese idioma. La interfaz es bilingüe (español por defecto e inglés): **nunca escribas texto visible directamente**, usa `__()` (ver "Idiomas (i18n)").

## Monorepo

- `apps/api/` — **la única app funcional**: Laravel 13 (PHP 8.3+) + frontend React 19 / TypeScript servido con Inertia v2, Vite 8 y Tailwind 4. Todos los comandos se ejecutan desde aquí.
- `apps/web/` — vacío, reservado para una futura SPA separada. No poner código del frontend aquí.
- `apps/narrative-engine/` — esqueleto Python (FastAPI previsto); todos los `.py` están vacíos. Hoy el "análisis" lo hacen servicios PHP simulados (ver abajo).
- `compose.yaml` — solo MySQL 8.4 (BD `gamerdust`). En local se usa Laragon apuntando a `apps/api/public`.
- `docs/` — documentación (`docs/architecture/Gamerdust_Documentacion.ipynb`); `tests/e2e/` vacío.

## Comandos (en `apps/api`)

```
composer setup             # install + .env + key + migrate + npm install + build
composer dev               # serve + queue:listen + pail + vite en paralelo
php artisan serve          # o: npm run dev  (en otra terminal)
npm run build              # build de producción de Vite
php artisan test           # toda la suite (composer test limpia config antes)
php artisan test --filter=BranchingEditorTest            # una clase
php artisan test --filter=test_nombre_del_metodo         # un test
vendor/bin/pint            # formateo PHP (Laravel Pint)
npx tsc --noEmit           # chequeo de tipos TS (no hay script npm ni ESLint)
```

Los tests usan SQLite en memoria (`phpunit.xml`), no MySQL. No existe `.env.example`; copiar el `.env` existente.

## Arquitectura

### Inertia: controladores → páginas
Los controladores devuelven `Inertia::render('Modulo/Pagina')`. [resolve-page.ts](apps/api/resources/js/app/resolve-page.ts) traduce ese nombre a `resources/js/features/<modulo en minúsculas>/pages/<Pagina>.tsx` (p. ej. `Projects/Index` → `features/projects/pages/Index.tsx`, `Landing` → `features/landing/pages/Landing.tsx`). Una página nueva debe seguir esa ruta o falla en runtime. Cada feature tiene `pages/`, `components/` y un `<feature>.types.ts`; layouts en `resources/js/layouts/`, clases Tailwind reutilizables en `shared/lib/styles.ts`. `HandleInertiaRequests` comparte `auth.user` y `flash.success/error`.

### Idiomas (i18n)
- **La clave es el texto en inglés** y `lang/es.json` contiene la traducción al español (con sus tildes). No existe `lang/en.json`: en inglés se muestra la propia clave. Un texto nuevo = `__('English text')` + su entrada en `lang/es.json`.
- PHP: `__('Scene created.')`, con parámetros `__('The scene :title has no clear conflict.', ['title' => ...])`. Validación, auth y paginación van en `lang/{en,es}/*.php`; los nombres de campo en español están en `lang/es/validation.php` → `attributes` (añade ahí los campos nuevos).
- React: `__()` y `choice()` de [shared/lib/i18n.ts](apps/api/resources/js/shared/lib/i18n.ts), que importa `lang/*.json` con Vite (mismo catálogo que PHP). `choice(':count scene|:count scenes', n)` para plurales. Los identificadores de BD (tipos de diálogo/lore, emociones, estados, géneros) se traducen con mapas de etiquetas (`projectOptions.ts`, `analysis/labels.ts`, `lore/loreOptions.ts`, `branching/layout.ts`).
- Idioma activo: `config('app.locale')` (`es`) salvo que la cookie `locale` indique otro de `config('app.supported_locales')`; lo aplica el middleware `SetLocale`. `LocaleSwitcher` enlaza a `GET /locale/{locale}` (enlace normal, no Inertia: la página se recarga y el frontend lee el idioma de `<html lang>`).
- **Idioma del proyecto ≠ idioma de la interfaz**: `projects.language` (`es`/`en`) indica en qué idioma se escribe la narrativa. Los textos que generan los servicios de análisis y se guardan en BD quedan en el idioma de la interfaz del momento en que se generaron.

### Estudio de proyecto (sidebar)
- `ProjectLayout` detecta si la página recibe una prop `project` (con `id` y `title`): en ese caso la envuelve en el estudio (cabecera con hamburguesa + `ProjectSidebar` + ruta). Sin `project` (p. ej. Cuenta) se muestra como página simple. Las páginas nuevas de proyecto solo tienen que pasar `project` desde el controlador.
- Secciones en `PROJECT_SECTIONS` (`layouts/components/ProjectSidebar.tsx`): Panel (`Projects/Show`), Biblia Narrativa, Guion, Escenas, Diálogos (ramificación), Mecánicas, Colaboración, Análisis IA, Reportes. `also` marca rutas clásicas que activan una sección (personajes/lore → Biblia; dialogues → Diálogos).
- En escritorio el sidebar se pliega (preferencia en `localStorage`); en móvil es un `<dialog>`. `bare` en `ProjectLayout` quita márgenes y título (lo usa el editor de guion).
- Lecturas combinadas en `StudioController` (biblia, análisis, colaboración, reportes y descarga Markdown); `MechanicController` y `CommentController` son CRUD Inertia.

### Editor de guion
- Rutas `projects/{project}/script/*`: `index` es Inertia, el resto JSON (como ramificación) vía `shared/lib/api.ts`. `print` es una vista Blade con formato de guion que el navegador imprime/guarda como PDF.
- Cada escena guarda sus bloques en `scenes.script` (JSON `[{id, kind, text}]`, tipos en `ScriptService::KINDS`), `act`, `location_id` (entrada de lore) y personajes en la pivote `character_scene`. El código visible (E01…) se calcula por `order`, no se guarda.
- Concurrencia: el cliente reenvía `updated_at`; si no coincide, el servidor responde 409 y no pisa. Cada guardado o restauración crea una `SceneVersion` (se conservan 30 por escena).
- El cliente guarda borradores por escena con deshacer/rehacer local y solo persiste al pulsar Guardar (Ctrl/⌘+S); `useUnsaved` avisa antes de salir. Los comentarios recargan solo la prop `comments` para no perder borradores.

### Autorización por proyecto
Todo cuelga de `Project` (propiedad de `User`); todas las tablas de dominio tienen `project_id` con `cascadeOnDelete`. `ProjectPolicy` solo comprueba `project->user_id === user->id`. Las rutas anidadas (`projects.lore`, `projects.characters`, ...) deben además verificar que el hijo pertenece al proyecto (`abort_unless(... project_id === $project->id, 404)`); ver `ensureNode/ensureOption` en `BranchingGraphController` y `BranchingRequest::authorize()`.

### Editor de ramificación (la parte más compleja)
Rutas `projects/{project}/branching/*`: `index` es una página Inertia, el resto son endpoints **JSON** (bootstrap/app.php fuerza respuestas de error JSON para esas rutas cuando `wantsJson`). El frontend ([features/branching](apps/api/resources/js/features/branching)) usa `@xyflow/react` y un `fetch` propio con XSRF (`api.ts`), no `router` de Inertia.

- **El servidor es la fuente de verdad**: cada mutación devuelve el grafo completo (`BranchingGraphResource`) y el cliente lo reemplaza. `useBranchingGraph` guarda borradores con debounce (texto 800 ms, posiciones 500 ms), en serie.
- **Referencias `{{Título}}`**: escribir `{{Nombre}}` en el texto de un nodo crea/enlaza automáticamente el nodo destino y una `DialogueOption` *administrada* (`source_ref` = título normalizado). `ReferenceParser` es puro (sin BD); `ReferenceSyncService` sincroniza dentro de transacciones con bloqueo del proyecto. Las opciones manuales (`source_ref` null) nunca se tocan en la sincronización.
- **Renombrar** un nodo reescribe `{{Antiguo}}` → `{{Nuevo}}` en todos los textos del proyecto conservando `id`/`node_key`. Los títulos son únicos por proyecto comparando la forma normalizada (minúsculas, espacios colapsados) de `displayTitle()`.
- `GraphInspector` (solo lectura) calcula nodo inicial (menor id) y avisos: `broken_option`, `isolated`, `no_incoming`, `no_outgoing`.
- `BranchingNodeService` orquesta crear/actualizar/borrar nodos y opciones sobre los servicios anteriores. Existe además un CRUD clásico de diálogos (`DialogueNodeController`, formularios Inertia) que gestiona opciones por su cuenta.

### Servicios de "análisis" (simulados)
- `EmotionalAnalysisService`: puntuación por palabras clave → emoción dominante + VAD. Se guarda en `emotional_analyses` (polimórfica `analyzable`). El análisis desde el editor nunca modifica el texto, es solo sugerencia.
- `NarrativeValidationService`: reglas simples (premisa, motivación, conflicto, función del lore). Se ejecuta en cada `ProjectController@show` y **borra y recrea** las validaciones no resueltas.
- `NarrativeCostEstimatorService`: heurística de coste para `Scene`/`DialogueNode` (polimórfica `costable`), invocada al crear/editar.

Están pensados para ser sustituidos por `apps/narrative-engine`.

### Esquema
Tablas de dominio en `2026_06_04_000000_create_gamerdust_tables.php` más migraciones incrementales posteriores (idioma/favorito, campos de setup narrativo, `expected_outcome` en restricciones, campos de ramificación: `title`, `node_key`, `pos_x/pos_y`, `source_ref`). `project_constraints` es 1:1 con proyecto (store y update usan el mismo método `store`). `ai_generations` existe pero aún no se usa.

## Convenciones
- `.editorconfig`: 4 espacios, LF (YAML 2 espacios).
- Validación en FormRequests (`app/Http/Requests`, los de ramificación heredan de `Branching/BranchingRequest`).
- Tests de feature con `RefreshDatabase`; los proyectos se crean vía `$user->projects()->create([...])` (solo existe `UserFactory`).
