#!/usr/bin/env node
// Pruebas de navegador de Gamerdust (Chrome headless + CDP, sin dependencias).
//
//   node tests/e2e/run.mjs                  todos los escenarios
//   node tests/e2e/run.mjs --only=script,ai  solo algunos (por nombre)
//   node tests/e2e/run.mjs --skip-build      no ejecuta "npm run build" antes
//   node tests/e2e/run.mjs --keep            conserva la carpeta temporal (BD, logs, perfiles)
//
// Variables: PHP_BINARY (PHP ≥ 8.4; en Laragon, la ruta a php.exe), CHROME_PATH, E2E_PORT (8765).
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { App, ROOT } from './lib/app.mjs';
import { Browser } from './lib/browser.mjs';
import account from './scenarios/account.mjs';
import ai from './scenarios/ai.mjs';
import collaboration from './scenarios/collaboration.mjs';
import dialogues from './scenarios/dialogues.mjs';
import script from './scenarios/script.mjs';

// El orden importa: comparten la BD y "account" cambia la contraseña del usuario de pruebas.
const SCENARIOS = [dialogues, script, ai, collaboration, account];

const args = process.argv.slice(2);
const only = args.find((arg) => arg.startsWith('--only='))?.slice(7).split(',');
const selected = SCENARIOS.filter((scenario) => !only || only.includes(scenario.name));

if (!selected.length) {
    console.error(`Ningún escenario coincide. Disponibles: ${SCENARIOS.map((scenario) => scenario.name).join(', ')}`);
    process.exit(2);
}

const tmp = mkdtempSync(join(tmpdir(), 'gamerdust-e2e-'));
const app = new App(tmp, Number(process.env.E2E_PORT ?? 8765));
let failed = 0;

try {
    if (!args.includes('--skip-build')) {
        console.log('· npm run build');
        execSync('npm run build', { cwd: ROOT, stdio: 'ignore' });
    }

    console.log('· Base de datos temporal con CumbreMudaSeeder');
    app.prepare();
    await app.start();
    console.log(`· Servidor en ${app.base}\n`);

    for (const scenario of selected) {
        const results = [];
        const browsers = [];
        const ctx = {
            app,
            base: app.base,
            fixtures: app.fixtures,
            check: (name, ok, detail) => results.push({ name, ok: Boolean(ok), detail }),
            // Cada navegador tiene su propio perfil (sesión y localStorage aislados).
            browser: async () => {
                const browser = new Browser(app.base, tmp);
                browsers.push(browser);

                return browser.connect();
            },
        };

        console.log(`▸ ${scenario.title}`);

        try {
            await scenario.run(ctx);
        } catch (error) {
            results.push({ name: 'el escenario terminó con un error', ok: false, detail: String(error?.message ?? error) });
        } finally {
            await Promise.all(browsers.map((browser) => browser.close()));
        }

        for (const result of results) {
            console.log(`  ${result.ok ? '✓' : '✗'} ${result.name}${result.ok ? '' : `\n      ${JSON.stringify(result.detail ?? null).slice(0, 500)}`}`);
            failed += result.ok ? 0 : 1;
        }

        console.log('');
    }
} catch (error) {
    console.error(`✗ ${error?.message ?? error}`);
    failed++;
} finally {
    app.stop();

    if (args.includes('--keep') || failed) {
        console.log(`Carpeta temporal (BD, server.log, perfiles): ${tmp}`);
    } else {
        try {
            rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
        } catch {
            // Windows puede retener un instante los archivos del perfil de Chrome: no es un fallo de la prueba.
        }
    }
}

console.log(failed ? `${failed} comprobación(es) fallida(s).` : 'Todas las comprobaciones pasaron.');
process.exit(failed ? 1 : 0);
