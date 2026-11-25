# Despliegue de Gamerdust en producción

Guía para publicar la aplicación (Laravel 13 + Inertia/React; la raíz del repositorio es la app) en un servidor Linux con Nginx, PHP-FPM y MySQL. Todos los comandos se ejecutan en la raíz del repositorio (`/var/www/gamerdust`) salvo que se indique otra cosa. Esta guía no despliega nada por sí sola: cada paso lo ejecuta quien administra el servidor.

## 1. Requisitos del servidor

| Componente | Versión | Notas |
|---|---|---|
| PHP (CLI y FPM) | 8.3 o superior (recomendado 8.4) | Extensiones: `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `fileinfo`, `curl`, `bcmath`. |
| Composer | 2.x | |
| Node.js | 20.19+ o 22.12+ | Solo para compilar el frontend (`npm run build`); puede hacerse en otra máquina. |
| MySQL | 8.4 | Base `gamerdust` con `utf8mb4`. `compose.yaml` levanta una igual para pruebas. |
| Servidor web | Nginx (o Apache) | El *document root* es `public/`. Nunca la raíz del repositorio (ahí están `.env`, `vendor/` y el código). |
| Certificado TLS | Let's Encrypt (Certbot) u otro | HTTPS obligatorio: sesión, CSRF y contraseñas viajan en cada petición. |

## 2. Código y dependencias

```bash
git clone <repositorio> /var/www/gamerdust
cd /var/www/gamerdust

composer install --no-dev --optimize-autoloader
npm ci
npm run build        # genera public/build; Node ya no hace falta después
```

Permisos: el usuario de PHP-FPM (p. ej. `www-data`) debe poder escribir en `storage/` y `bootstrap/cache/`.

```bash
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R ug+rwX storage bootstrap/cache
```

El concept art de los personajes se guarda en el disco privado `local` (`storage/app/private`) y la app lo sirve tras autorizar, así que **no** hace falta `php artisan storage:link`.

## 3. `.env` de producción

No existe `.env.example`: crea el archivo a mano a partir de esta plantilla. **Nunca lo subas al repositorio.**

```dotenv
APP_NAME=Gamerdust
APP_ENV=production
APP_KEY=                      # se genera en el paso 4
APP_DEBUG=false               # imprescindible: con true se muestran trazas, SQL y variables
APP_URL=https://gamerdust.ejemplo.org
APP_LOCALE=es
APP_FALLBACK_LOCALE=en

# Base de datos
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=gamerdust
DB_USERNAME=gamerdust
DB_PASSWORD=<contraseña larga y única>

# Sesión y cookies solo por HTTPS
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=true
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax

CACHE_STORE=database
QUEUE_CONNECTION=database
FILESYSTEM_DISK=local

# Registro: errores de Laravel por día y canal propio de Gamerdust (ver sección 9)
LOG_CHANNEL=stack
LOG_STACK=daily
LOG_LEVEL=warning
LOG_DAILY_DAYS=14
GAMERDUST_LOG_LEVEL=info
GAMERDUST_LOG_DAYS=30

# Correo real (la recuperación de contraseña lo necesita; "log" es solo para desarrollo)
MAIL_MAILER=smtp
MAIL_SCHEME=smtps
MAIL_HOST=smtp.proveedor.com
MAIL_PORT=465
MAIL_USERNAME=<usuario>
MAIL_PASSWORD=<contraseña>
MAIL_FROM_ADDRESS="no-responder@gamerdust.ejemplo.org"
MAIL_FROM_NAME="${APP_NAME}"

# IA (Groq). Sin clave, el análisis emocional usa palabras clave y Refinar/Borrador muestran un aviso.
GROQ_API_KEY=<clave de Groq>
GROQ_MODEL=openai/gpt-oss-120b
GROQ_FALLBACK_MODEL=openai/gpt-oss-20b
GROQ_TIMEOUT=15
GAMERDUST_AI_DRIVER=groq
```

Protege el archivo: `chmod 640 .env` y propietario `root:www-data`.

## 4. Primera instalación

```bash
php artisan key:generate --force     # solo la primera vez: cambiarla invalida sesiones y datos cifrados
php artisan migrate --force
```

**No ejecutes `php artisan db:seed` en producción**: el seeder crea el proyecto de demostración con el usuario `test@example.com` y la contraseña `password`. Si necesitas la demo, créala en una instancia aparte o cambia esa contraseña inmediatamente.

## 5. HTTPS con Nginx

Ejemplo de *server block* (`/etc/nginx/sites-available/gamerdust`):

```nginx
server {
    listen 80;
    server_name gamerdust.ejemplo.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name gamerdust.ejemplo.org;
    root /var/www/gamerdust/public;
    index index.php;

    ssl_certificate     /etc/letsencrypt/live/gamerdust.ejemplo.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gamerdust.ejemplo.org/privkey.pem;
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;

    client_max_body_size 8M;   # imágenes de personajes

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
    }

    location ~ /\.(?!well-known) { deny all; }
}
```

Certificado y renovación automática:

```bash
sudo certbot --nginx -d gamerdust.ejemplo.org
sudo certbot renew --dry-run
```

Si la app queda detrás de un balanceador o proxy que termina TLS (Cloudflare, un PaaS…), Laravel verá peticiones `http`. En ese caso hay que declarar los proxies de confianza en `bootstrap/app.php` (`$middleware->trustProxies(at: '...')`); hoy no está configurado porque el despliegue previsto termina TLS en el propio Nginx.

## 6. Optimizar

```bash
php artisan optimize        # cachea configuración, rutas, vistas y eventos
```

Con la configuración cacheada, Laravel **ya no lee `.env`**: tras cambiar cualquier variable vuelve a ejecutar `php artisan optimize` (o `php artisan optimize:clear` para depurar).

## 7. Cola de trabajos

`QUEUE_CONNECTION=database` usa la tabla `jobs` (ya incluida en las migraciones). Hoy ninguna funcionalidad encola trabajos: el correo de recuperación se envía durante la propia petición y la IA solo se llama al pulsar un botón. Aun así conviene dejar un *worker* activo para lo que se encole en el futuro. Con systemd (`/etc/systemd/system/gamerdust-queue.service`):

```ini
[Unit]
Description=Gamerdust queue worker
After=network.target mysql.service

[Service]
User=www-data
Group=www-data
Restart=always
WorkingDirectory=/var/www/gamerdust
ExecStart=/usr/bin/php artisan queue:work --sleep=3 --tries=3 --max-time=3600

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now gamerdust-queue
```

Si prefieres no mantener un *worker*, `QUEUE_CONNECTION=sync` ejecuta los trabajos en la misma petición.

## 8. Comprobaciones tras instalar

```bash
php artisan about                    # entorno production, debug desactivado, cachés activas
php artisan gamerdust:groq-check     # llamada real mínima a Groq: clave, tokens y latencia
curl -I https://gamerdust.ejemplo.org/up   # 200 = la app arranca
```

En el navegador:
1. `https://…/register` → crea una cuenta.
2. Cierra sesión → "¿Olvidaste tu contraseña?" → el correo llega con el enlace → elige una contraseña nueva → entra.
3. Crea un proyecto, escribe una escena en Guion y pulsa "Analizar emociones".
4. Reportes → "Reporte de análisis" se abre e imprime.

## 9. Observabilidad (canal `gamerdust`)

`storage/logs/gamerdust-AAAA-MM-DD.log` (uno por día, se conservan `GAMERDUST_LOG_DAYS`). Solo se registran identificadores, códigos y tiempos: **nunca** la clave de Groq, el prompt, la respuesta de la IA, el texto narrativo ni el mensaje de las excepciones.

| Evento | Nivel | Cuándo | Contexto |
|---|---|---|---|
| `ai.attempt_failed` | warning | Falla un intento con un modelo (429, 5xx, timeout, JSON inválido) | `project_id`, `user_id`, `type`, `model`, `attempt`, `reason` |
| `ai.fallback` | notice | Respondió el modelo de respaldo | `model`, `generation_id`, `latency_ms` |
| `ai.unavailable` | error | Fallaron ambos modelos | `type`, `reason`, `generation_id`, `latency_ms` |
| `ai.degraded` | notice | Se usó el análisis por palabras clave en lugar de la IA | `generation_id` |
| `ai.invalid_output` | warning | La IA respondió pero el resultado no pasó la validación en PHP | `generation_id`, `user_id` |
| `http.server_error` | error (503: warning) | Cualquier respuesta 5xx | `method`, `path` (sin query), `route`, `status`, `user_id`, `exception` (clase), `at` (archivo:línea) |

`generation_id` enlaza con la fila de `ai_generations` (tokens, modelo, estado), visible con `php artisan gamerdust:ai-metrics`.

```bash
tail -f storage/logs/gamerdust-$(date +%F).log
grep '"status":500' storage/logs/gamerdust-*.log
```

`storage/logs/laravel-*.log` (canal `daily`) sigue guardando la traza completa de cada excepción no controlada. Esa traza **sí puede contener datos** (p. ej. el SQL de un fallo con texto del guion), así que ese archivo no debe salir del servidor ni compartirse.

## 10. Actualizar una versión

```bash
cd /var/www/gamerdust
php artisan down --retry=30
git pull
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan migrate --force
php artisan optimize
php artisan queue:restart
php artisan up
```

**Servidores instalados antes de la reorganización** (cuando la app vivía en `apps/api`): antes del primer `git pull` con la nueva estructura, ejecuta `php apps/api/artisan down`; después del `git pull`, mueve `apps/api/.env` y el contenido de `apps/api/storage/app/private` a la raíz (`.env` y `storage/app/private`), cambia `root` de Nginx a `/var/www/gamerdust/public` y `WorkingDirectory` del servicio de cola a `/var/www/gamerdust`, recarga (`sudo nginx -s reload`, `sudo systemctl daemon-reload && sudo systemctl restart gamerdust-queue`) y sigue con los pasos anteriores desde `composer install`. Cuando todo funcione, borra lo que quede en `apps/` (solo `vendor/`, `node_modules/`, `public/build` y archivos generados en `storage/`). La base de datos y la tabla `migrations` no cambian.

## 11. Copias de seguridad

- Base de datos: `mysqldump --single-transaction gamerdust | gzip > gamerdust-$(date +%F).sql.gz` (diaria, fuera del servidor).
- Archivos: `storage/app/private` (concept art).
- El `.env` (sobre todo `APP_KEY`): sin él no se pueden descifrar las sesiones ni los datos cifrados.

## 12. Lista de verificación

- [ ] `APP_ENV=production` y `APP_DEBUG=false`.
- [ ] `APP_URL` con `https://` y certificado válido; HTTP redirige a HTTPS.
- [ ] `SESSION_SECURE_COOKIE=true`.
- [ ] `APP_KEY` generada una sola vez y respaldada.
- [ ] `.env` fuera del repositorio y con permisos 640.
- [ ] El *document root* apunta a `public/` (`/var/www/gamerdust/public`).
- [ ] Migraciones aplicadas; seeder de demostración **no** ejecutado.
- [ ] `php artisan optimize` ejecutado tras el último cambio de `.env`.
- [ ] Correo SMTP real configurado y recuperación de contraseña probada.
- [ ] `gamerdust:groq-check` responde (o se acepta trabajar con palabras clave).
- [ ] *Worker* de cola activo (o `QUEUE_CONNECTION=sync`).
- [ ] `storage/logs/gamerdust-*.log` se escribe y se revisa.
- [ ] Copias de seguridad de la base de datos y de `storage/app/private` programadas.
