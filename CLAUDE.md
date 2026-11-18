# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Gamerdust es una app web de asistencia al diseño narrativo de videojuegos (proyectos, lore, personajes, escenas, diálogos ramificados, análisis emocional, validación de coherencia y estimación de coste). Los comentarios del código están en español; mantén ese idioma. La interfaz es bilingüe (español por defecto e inglés): **nunca escribas texto visible directamente**, usa `__()` (ver "Idiomas (i18n)").

## Monorepo

- `apps/api/` — **la única app funcional**: Laravel 13 (PHP 8.3+) + frontend React 19 / TypeScript servido con Inertia v2, Vite 8 y Tailwind 4. Todos los comandos se ejecutan desde aquí.
- `apps/web/` — vacío, reservado para una futura SPA separada. No poner código del frontend aquí.
- `apps/narrative-engine/` — esqueleto Python (FastAPI previsto); todos los `.py` están vacíos. Hoy el análisis emocional lo hace PHP con Groq (o por palabras clave sin clave) detrás del contrato `EmotionAnalyzer` (ver abajo).
- `compose.yaml` — solo MySQL 8.4 (BD `gamerdust`). En local se usa Laragon apuntando a `apps/api/public`.
- `docs/` — documentación (`docs/architecture/Gamerdust_Documentacion.ipynb`); `tests/e2e/` vacío.

## Comandos (en `apps/api`)

```
composer setup             # install + .env + key + migrate + npm install + build
composer dev               # serve + queue:listen + pail + vite en paralelo
php artisan serve          # o: npm run dev  (en otra terminal)
npm run build              # build de producción de Vite
php artisan test           # toda la suite (composer test limpia config antes)
php artisan gamerdust:test [--filter=...]                # la misma suite con la salida en español y APP_LOCALE=es (composer test:es)
php artisan test --filter=BranchingEditorTest            # una clase
php artisan test --filter=test_nombre_del_metodo         # un test
vendor/bin/pint            # formateo PHP (Laravel Pint)
npx tsc --noEmit           # chequeo de tipos TS (no hay script npm ni ESLint)
php artisan gamerdust:groq-check [--model=...]          # llamada real mínima a Groq (clave, tokens, latencia)
php artisan gamerdust:ai-metrics {project?} [--output=f.csv]  # métricas de uso y valoración de la IA a CSV (OE4)
```

Variables de IA en `.env` (valores por defecto en `config/services.php` → `groq` y `config/gamerdust.php`): `GROQ_API_KEY`, `GROQ_MODEL` (`openai/gpt-oss-120b`), `GROQ_FALLBACK_MODEL` (`openai/gpt-oss-20b`), `GROQ_TIMEOUT` (15 s), `GAMERDUST_AI_DRIVER` (`groq`|`keywords`; por defecto `groq` si hay clave) y `GAMERDUST_AI_MAX_TOKENS`. La clave nunca sale del servidor.

Los tests usan SQLite en memoria (`phpunit.xml`), no MySQL. `phpunit.xml` vacía `GROQ_API_KEY`, fija el motor `keywords` y desactiva el SSR de Inertia; `Tests\TestCase` llama a `Http::preventStrayRequests()`, así que cualquier test que use Groq debe definir la clave con `config()` y usar `Http::fake()`. No existe `.env.example`; copiar el `.env` existente.
Con `APP_LOCALE=en` en `.env` fallan 5 tests que esperan textos en español (p. ej. `DÍA` en el guion); ejecutar con `APP_LOCALE=es php artisan test`. En Laragon el CLI necesita PHP ≥ 8.4 (ruta `laragon/bin/php/php-8.5...`).

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
- Reportes exporta también los diálogos en un HTML autónomo tipo Twine (`GET reports/dialogues`, vista `reports/dialogues.blade.php`): reutiliza `BranchingGraphResource` incrustado como JSON, con pestañas Mapa (pan/zoom, posiciones del editor) y Jugar (las `{{refs}}` son enlaces, las opciones manuales botones). JS y CSS inline, sin red; los textos van traducidos desde PHP. Cuidado: en la vista, escribe `@{{` si un comentario contiene llaves dobles.
- Análisis IA con pestañas (`AnalysisTabs`): métricas y coherencia (`/analysis`) y evolución emocional (`/analysis/evolution`, Vistas A y B con Recharts cargado con `React.lazy`; datos de `GET analysis/emotion-timeline`, `EmotionTimelineService`, solo lectura).
- Biblia Narrativa con pestañas (`features/bible/components/BibleTabs`): Esencia (`/bible`), Personajes (`/characters`), Lugares y Reglas del mundo (`/bible/{locations|rules}`, `BibleEntryController`). Las tres fichas son catálogo + formulario en una página (`useEntryEditor`, `EntryCatalog`, `LinkRow`); `characters/create` y `/{id}/edit` solo redirigen a `?new=1` / `?character=id`.
- Personajes: concept art en el disco privado `local`, servido por `projects.characters.image` tras autorizar (no hace falta `storage:link`); escenas en la pivote `character_scene` (la misma del guion). Con archivo el formulario va en multipart (POST + `_method=put`), donde una lista vacía no viaja: la ficha envía `sync_scenes` para vaciar escenas.
- Lugares y reglas son entradas de lore (`type` location/rule) con campos propios (`subtype`, `parent_id`, `statement`, `rigidity`...). El lugar de una escena es `scenes.location_id` (vincular escenas a un lugar lo cambia); lugar ↔ regla/lore en `lore_entry_links`, guardado **en ambos sentidos**; personajes en `character_lore_entry` (`role` breaks/enforces en reglas). `shared/components/LinkPicker` se comparte con Mecánicas.

### Editor de guion
- Rutas `projects/{project}/script/*`: `index` es Inertia, el resto JSON (como ramificación) vía `shared/lib/api.ts`. `print` es una vista Blade con formato de guion que el navegador imprime/guarda como PDF.
- Cada escena guarda sus bloques en `scenes.script` (JSON `[{id, kind, text}]`, tipos en `ScriptService::KINDS`), `act`, `location_id` (entrada de lore) y personajes en la pivote `character_scene`. El código visible (E01…) se calcula por `order`, no se guarda.
- Concurrencia: el cliente reenvía `updated_at`; si no coincide, el servidor responde 409 y no pisa. Cada guardado o restauración crea una `SceneVersion` (se conservan 30 por escena).
- El cliente guarda borradores por escena con deshacer/rehacer local y solo persiste al pulsar Guardar (Ctrl/⌘+S); `useUnsaved` avisa antes de salir. Los comentarios recargan solo la prop `comments` para no perder borradores.
- IA en el editor (JSON): `GET|POST script/scenes/{scene}/analysis|analyze` (`SceneEmotionController`, panel `EmotionPanel`; exige escena guardada: analiza la versión guardada) y `POST script/scenes/{scene}/refine` (`AiAssistController`, `RefineDialog`). Borrador de personaje: `POST ai/character-draft`; votos: `POST ai/feedback`.

### Autorización por proyecto
Todo cuelga de `Project` (propiedad de `User`); todas las tablas de dominio tienen `project_id` con `cascadeOnDelete`. `ProjectPolicy` solo comprueba `project->user_id === user->id`. Las rutas anidadas (`projects.lore`, `projects.characters`, ...) deben además verificar que el hijo pertenece al proyecto (`abort_unless(... project_id === $project->id, 404)`); ver `ensureNode/ensureOption` en `BranchingGraphController` y `BranchingRequest::authorize()`.

### Editor de ramificación (la parte más compleja)
Rutas `projects/{project}/branching/*`: `index` es una página Inertia, el resto son endpoints **JSON** (bootstrap/app.php fuerza respuestas de error JSON cuando `wantsJson` para `branching/*`, `script/*`, `analysis/*` y `ai/*`). El frontend ([features/branching](apps/api/resources/js/features/branching)) usa `@xyflow/react` y un `fetch` propio con XSRF (`api.ts`), no `router` de Inertia.

- **El servidor es la fuente de verdad**: cada mutación devuelve el grafo completo (`BranchingGraphResource`) y el cliente lo reemplaza. `useBranchingGraph` guarda borradores con debounce (texto 800 ms, posiciones 500 ms), en serie.
- **Referencias `{{Título}}`**: escribir `{{Nombre}}` en el texto de un nodo crea/enlaza automáticamente el nodo destino y una `DialogueOption` *administrada* (`source_ref` = título normalizado). `ReferenceParser` es puro (sin BD); `ReferenceSyncService` sincroniza dentro de transacciones con bloqueo del proyecto. Las opciones manuales (`source_ref` null) nunca se tocan en la sincronización.
- **Renombrar** un nodo reescribe `{{Antiguo}}` → `{{Nuevo}}` en todos los textos del proyecto conservando `id`/`node_key`. Los títulos son únicos por proyecto comparando la forma normalizada (minúsculas, espacios colapsados) de `displayTitle()`.
- `GraphInspector` (solo lectura) calcula nodo inicial (menor id) y avisos: `broken_option`, `isolated`, `no_incoming`, `no_outgoing`.
- `BranchingNodeService` orquesta crear/actualizar/borrar nodos y opciones sobre los servicios anteriores. Existe además un CRUD clásico de diálogos (`DialogueNodeController`, formularios Inertia) que gestiona opciones por su cuenta.

### IA emocional (Groq) y servicios de análisis
Documentación completa del modelo (pipeline, centroides, prompt, esquema, decisiones) en [docs/modelo-asistencia-emocional.md](docs/modelo-asistencia-emocional.md).
- **Regla de oro:** la IA solo se llama cuando el usuario pulsa un botón (Analizar emociones, Reanalizar, Refinar con IA, Borrador con IA). Nunca desde `ProjectController@show`, al guardar, ni con observers/eventos. Propone; nunca modifica el guion ni guarda fichas sin confirmación.
- **Contrato** `App\Contracts\EmotionAnalyzer` (`analyzeScene(Scene)` → `SceneEmotionResult`, `source()`), elegido en `AppServiceProvider` por `config('gamerdust.ai.driver')`: `GroqEmotionAnalyzer` (si hay `GROQ_API_KEY`) o `KeywordEmotionAnalyzer` (adapta el `EmotionalAnalysisService` simulado, sin red). El contrato permite sustituirlo por `apps/narrative-engine`.
- **`GroqClient`** (`app/Services/Ai`): `chat/completions` con `json_schema` strict, `reasoning_effort: low`, `include_reasoning: false`. Ante 429/5xx/timeout/JSON inválido reintenta una vez con el modelo de respaldo; si vuelve a fallar lanza `AiUnavailableException`. Cada llamada con proyecto queda en `ai_generations` (`status` ok|fallback|degraded|error, tokens, `latency_ms`, `input_hash`; nunca la clave). La respuesta siempre se valida en PHP (`SceneResultValidator`).
- **Análisis de escena** (`SceneEmotionService`): caché por `content_hash` (`SceneContextBuilder::contentHash`: guion, vínculos, `updated_at` de fichas y reglas, esencia, locale; "Reanalizar" la ignora; un análisis degradado no se reutiliza) → analizador → `EmotionChangeDetector` → guarda `emotional_analyses` (`source`, `result` completo, `degraded`, `scene_version_id`) y sustituye las filas de `character_emotional_states` de la escena. Si Groq falla con ambos modelos se degrada a palabras clave (`degraded: true`); la edición nunca se bloquea.
- **Contexto** (`SceneContextBuilder`): esencia del proyecto, lugar (`location_id`) y sus reglas (`lore_entry_links`), personajes de `character_scene` con sus reglas (`character_lore_entry`), máx. `gamerdust.ai.max_context_items`, texto de `ScenePlainText` (conserva quién habla) recortado a `max_scene_words`. **Estado previo** de un personaje: su estado en la escena anterior analizada más cercana (por `order`) → si no, su estado inicial del autor (`characters.initial_emotion/initial_intensity` + `EmotionTranslator::fromAuthor`) → si no, ninguno.
- **"VAD invisible":** internamente v/a/d en 0-1; en la interfaz solo Tono/Tensión/Control del personaje y la emoción (`EmotionTranslator`, clase pura). Umbrales, centroides, colores, intensidades y umbral de cambio abrupto viven **solo** en `config/gamerdust.php`; el frontend los recibe por la prop `emotionCatalog` (sin números en TS). El modo técnico (localStorage) muestra los valores crudos. Las filas antiguas de `emotional_analyses` sin `content_hash` son de la simulación (valencia -1..1) y no se mezclan.
- **Regla vs. IA:** `EmotionChangeDetector` decide (cambio abrupto si `max(|Δv|,|Δa|,|Δd|) > 0.40`); la IA solo explica (`change_justified`). Rojo = abrupto y no justificado; ámbar = abrupto y justificado. También a nivel de escena frente a la escena anterior analizada.
- **Generar y refinar** (`app/Services/Assist`): `CharacterDraftService` (borrador que rellena la ficha nueva vía `useEntryEditor().fillNew`, sin guardar) y `BlockRefineService` (propuesta para un bloque; "Aplicar" solo toca el borrador local y entra en deshacer/rehacer). Sin degradación: 503 con mensaje amable. Valoraciones 👍/👎 en `ai_feedback` (`emotional_analysis_id` + `item_index` o `ai_generation_id`).
- **Límite propio:** `RateLimiter` `ai` (10/min por usuario) en las rutas que llaman a la IA.
- `NarrativeValidationService` (reglas simples, se ejecuta en `ProjectController@show` y en Análisis IA y **borra y recrea** las validaciones no resueltas) y `NarrativeCostEstimatorService` (heurística de coste al crear/editar) siguen siendo simulados. El análisis de nodos de diálogo en ramificación y el panel del Panel del proyecto usan aún `EmotionalAnalysisService` (palabras clave).

### Esquema
Tablas de dominio en `2026_06_04_000000_create_gamerdust_tables.php` más migraciones incrementales posteriores (idioma/favorito, campos de setup narrativo, `expected_outcome` en restricciones, campos de ramificación: `title`, `node_key`, `pos_x/pos_y`, `source_ref`). `project_constraints` es 1:1 con proyecto (store y update usan el mismo método `store`). IA emocional: columnas de seguimiento en `ai_generations`, columnas de IA en `emotional_analyses`, `character_emotional_states` (una fila por personaje y escena analizada), `characters.initial_emotion/initial_intensity` y `ai_feedback`.

## Convenciones
- `.editorconfig`: 4 espacios, LF (YAML 2 espacios).
- Validación en FormRequests (`app/Http/Requests`, los de ramificación heredan de `Branching/BranchingRequest`).
- Tests de feature con `RefreshDatabase`; los proyectos se crean vía `$user->projects()->create([...])` (solo existe `UserFactory`).
- Los métodos de test se nombran en español (`test_crea_el_proyecto_...`): Collision usa el nombre como descripción en consola.
- `CumbreMudaSeeder` (lo llama `DatabaseSeeder`) crea un proyecto de demostración completo para `test@example.com`; sus análisis emocionales están redactados en `CumbreMudaAnalyses` (sin red).
