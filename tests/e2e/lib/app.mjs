// Prepara una instancia aislada de la app para las pruebas de navegador: SQLite temporal con el seeder de
// demostración, servidor PHP en un puerto propio y logs (incluido el correo) en un archivo temporal.
// No toca la base de datos de Laragon ni storage/logs/laravel.log.
import { execFileSync, spawn } from 'node:child_process';
import { createWriteStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sleep } from './browser.mjs';

// Raíz del repositorio, que es la propia app Laravel (artisan, public/, vendor/).
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const php = () => process.env.PHP_BINARY ?? 'php';

export class App {
    constructor(tmp, port) {
        this.tmp = tmp;
        this.port = port;
        this.base = `http://127.0.0.1:${port}`;
        this.database = join(tmp, 'e2e.sqlite');
        this.serverLog = join(tmp, 'server.log');
        this.env = {
            ...process.env,
            // Las variables del proceso tienen prioridad sobre .env (Dotenv es inmutable).
            APP_ENV: 'local',
            APP_DEBUG: 'true',
            APP_URL: this.base,
            APP_LOCALE: 'es',
            DB_CONNECTION: 'sqlite',
            DB_DATABASE: this.database,
            DB_URL: '',
            SESSION_DRIVER: 'file',
            CACHE_STORE: 'array',
            QUEUE_CONNECTION: 'sync',
            MAIL_MAILER: 'log',
            MAIL_LOG_CHANNEL: 'stderr',
            LOG_CHANNEL: 'stderr',
            GAMERDUST_LOG_LEVEL: 'emergency',
            GROQ_API_KEY: '',
            GAMERDUST_AI_DRIVER: 'keywords',
            INERTIA_SSR_ENABLED: 'false',
            PHP_CLI_SERVER_WORKERS: '4',
        };
    }

    artisan(...args) {
        return execFileSync(php(), ['artisan', ...args], { cwd: ROOT, env: this.env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    }

    /** Ejecuta PHP dentro de la app y devuelve el JSON que imprime en la última línea. */
    tinker(code) {
        const output = this.artisan('tinker', '--execute', code).trim().split(/\r?\n/);

        return JSON.parse(output.filter((line) => line.startsWith('{')).at(-1));
    }

    /** Base de datos nueva con CumbreMudaSeeder y los ids que usan los escenarios. */
    prepare() {
        if (existsSync(join(ROOT, 'bootstrap/cache/config.php'))) {
            throw new Error('La configuración está cacheada (bootstrap/cache/config.php): ejecuta "php artisan config:clear" antes de las pruebas.');
        }

        writeFileSync(this.database, '');
        this.artisan('migrate:fresh', '--seed', '--force');

        this.fixtures = this.tinker(`
            $project = App\\Models\\Project::where('title', Database\\Seeders\\CumbreMudaSeeder::TITLE)->firstOrFail();
            $node = $project->dialogueNodes()->where('title', 'Marcos esquiva la pregunta')->firstOrFail();
            echo json_encode([
                'project' => $project->id,
                'marcos' => $project->characters()->where('name', 'like', 'Marcos%')->value('id'),
                'node' => $node->id,
            ]);
        `);

        // HTML de diálogos tal como lo descarga Reportes (el reproductor sin conexión).
        this.exportFile = join(this.tmp, 'dialogos.html');
        const exported = this.tinker(`
            $html = app(App\\Services\\Branching\\DialoguePlayerView::class)->render(request(), App\\Models\\Project::findOrFail(${this.fixtures.project}));
            file_put_contents(${JSON.stringify(this.exportFile)}, $html);
            echo json_encode(['bytes' => strlen($html)]);
        `);

        if (!exported.bytes) {
            throw new Error('No se pudo generar el HTML de diálogos.');
        }
    }

    async start() {
        const log = createWriteStream(this.serverLog);
        const server = join(ROOT, 'vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php');

        // php -S con el router de Laravel; debe ejecutarse desde public/.
        this.server = spawn(php(), ['-S', `127.0.0.1:${this.port}`, server], { cwd: join(ROOT, 'public'), env: this.env });
        this.server.stdout.pipe(log);
        this.server.stderr.pipe(log);

        for (let i = 0; i < 100; i++) {
            try {
                if ((await fetch(`${this.base}/up`)).ok) {
                    return;
                }
            } catch {
                // Aún arrancando.
            }

            await sleep(150);
        }

        throw new Error(`El servidor PHP no arrancó en ${this.base}. Revisa ${this.serverLog}`);
    }

    /** Lo escrito en el log del servidor desde `offset` (el correo de MAIL_MAILER=log llega aquí). */
    logSince(offset = 0) {
        return readFileSync(this.serverLog, 'utf8').slice(offset);
    }

    logSize() {
        return existsSync(this.serverLog) ? readFileSync(this.serverLog, 'utf8').length : 0;
    }

    stop() {
        this.server?.kill();
    }
}
