# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Gamerdust es una app web de asistencia al diseño narrativo de videojuegos (proyectos, lore, personajes, escenas, diálogos ramificados, análisis emocional, validación de coherencia y estimación de coste). El código, la UI, los mensajes de validación y los comentarios están en español; mantén ese idioma.

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
