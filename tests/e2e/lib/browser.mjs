// Chrome headless controlado por el protocolo DevTools (CDP) con el WebSocket nativo de Node: sin dependencias.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

export { sleep };

export function chromePath() {
    if (process.env.CHROME_PATH) {
        return process.env.CHROME_PATH;
    }

    return {
        win32: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    }[process.platform] ?? 'google-chrome';
}

let nextPort = Number(process.env.E2E_DEBUG_PORT ?? 9400);

export class Browser {
    /**
     * @param {string} base  URL de la app (http://127.0.0.1:puerto)
     * @param {string} tmp   carpeta temporal de la ejecución (perfil propio por navegador)
     */
    constructor(base, tmp) {
        this.base = base;
        this.port = nextPort++;
        this.seq = 0;
        this.pending = new Map();
        this.listeners = [];
        this.proc = spawn(chromePath(), [
            '--headless=new',
            '--disable-gpu',
            '--no-first-run',
            '--no-default-browser-check',
            '--window-size=1366,900',
            `--remote-debugging-port=${this.port}`,
            `--user-data-dir=${mkdtempSync(join(tmp, 'chrome-'))}`,
            'about:blank',
        ]);
        this.proc.on('error', (error) => {
            this.startError = error;
        });
    }

    async connect() {
        let url = null;

        for (let i = 0; i < 75 && !url; i++) {
            if (this.startError) {
                throw new Error(`No se pudo abrir Chrome (${chromePath()}): ${this.startError.message}. Define CHROME_PATH.`);
            }

            try {
                url = (await (await fetch(`http://127.0.0.1:${this.port}/json/list`)).json()).find((target) => target.type === 'page')?.webSocketDebuggerUrl ?? null;
            } catch {
                // Chrome aún arrancando.
            }

            if (!url) {
                await sleep(200);
            }
        }

        if (!url) {
            throw new Error(`Chrome no respondió en el puerto ${this.port}.`);
        }

        // El listener de "open" se registra en el mismo tick en que se crea el socket (si no, se pierde el evento).
        this.ws = new WebSocket(url);
        await new Promise((resolve, reject) => {
            this.ws.addEventListener('open', resolve, { once: true });
            this.ws.addEventListener('error', () => reject(new Error(`No se pudo conectar con Chrome (${url}).`)), { once: true });
        });
        this.ws.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);

            if (message.id && this.pending.has(message.id)) {
                this.pending.get(message.id)(message);
                this.pending.delete(message.id);
            }

            if (message.method) {
                this.listeners.forEach((listener) => listener(message));
            }
        });

        // confirm()/beforeunload se aceptan (equivale a confirmar o cerrar la pestaña con cambios).
        this.on((message) => {
            if (message.method === 'Page.javascriptDialogOpening') {
                this.send('Page.handleJavaScriptDialog', { accept: true });
            }
        });
        await this.send('Page.enable');
        await this.send('Runtime.enable');
        await this.send('Browser.grantPermissions', { permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'], origin: this.base }).catch(() => undefined);

        return this;
    }

    on(listener) {
        this.listeners.push(listener);
    }

    /** Orden CDP; si Chrome no responde en 30 s falla (una prueba nunca se queda colgada). */
    send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = ++this.seq;
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`Chrome no respondió a ${method}`));
            }, 30000);
            this.pending.set(id, (message) => {
                clearTimeout(timer);
                resolve(message);
            });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async eval(expression) {
        const response = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });

        if (response.result?.exceptionDetails) {
            throw new Error(`${expression.slice(0, 100)} :: ${response.result.exceptionDetails.exception?.description ?? JSON.stringify(response.result.exceptionDetails)}`);
        }

        return response.result?.result?.value;
    }

    async waitFor(expression, timeout = 10000) {
        const end = Date.now() + timeout;

        while (Date.now() < end) {
            if (await this.eval(expression)) {
                return true;
            }

            await sleep(150);
        }

        throw new Error(`Tiempo agotado esperando: ${expression}`);
    }

    /** Navega a una ruta de la app (o a una URL completa) y espera a que cargue. */
    async go(path) {
        await this.send('Page.navigate', { url: /^[a-z]+:/.test(path) ? path : this.base + path });
        await sleep(400);
        await this.waitFor('document.readyState === "complete"');
    }

    text() {
        return this.eval('document.body.innerText');
    }

    /** Escribe en un input/textarea/select controlado por React (setter nativo + evento). */
    type(selector, value, index = 0) {
        return this.eval(`(() => {
            const el = document.querySelectorAll(${JSON.stringify(selector)})[${index}];
            if (!el) throw new Error('No existe ' + ${JSON.stringify(selector)});
            const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
            Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
            el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
            return true;
        })()`);
    }

    /** Pulsa el primer elemento del selector cuyo texto o aria-label cumple la expresión regular. */
    click(selector, pattern) {
        return this.eval(`(() => {
            const re = ${pattern.toString()};
            const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((x) => re.test(x.textContent) || re.test(x.getAttribute('aria-label') ?? ''));
            if (!el) throw new Error('No hay ' + ${JSON.stringify(selector)} + ' con ' + re);
            el.click();
            return true;
        })()`);
    }

    async login(email, password = 'password') {
        await this.go('/login');
        await this.waitFor('!!document.querySelector("input[type=password]")');
        await this.type('form input', email, 0);
        await this.type('input[type=password]', password);
        await this.eval('document.querySelector("form button[type=submit]").click()');
        await this.waitFor('location.pathname.startsWith("/projects")', 15000);
    }

    async logout() {
        await this.eval(`fetch('/logout', { method: 'POST', headers: { 'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)[1]) } })`);
        await sleep(300);
    }

    /** Petición desde la página (misma sesión y XSRF) → código de estado. */
    status(method, path, body) {
        return this.eval(`fetch(${JSON.stringify(path)}, {
            method: ${JSON.stringify(method)},
            headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-XSRF-TOKEN': decodeURIComponent((document.cookie.match(/XSRF-TOKEN=([^;]+)/) ?? [, ''])[1]) },
            body: ${body === undefined ? 'undefined' : JSON.stringify(JSON.stringify(body))},
        }).then((response) => response.status)`);
    }

    /**
     * Cierra como un usuario: salir de la página dispara `pagehide`, que suelta los bloqueos de edición
     * (si no, quedarían hasta caducar y otro escenario vería al usuario "editando").
     */
    async close() {
        try {
            if (this.ws?.readyState === WebSocket.OPEN) {
                await this.send('Page.navigate', { url: 'about:blank' });
                await sleep(400);
            }
        } catch {
            // Chrome ya no responde: se cierra igualmente.
        }

        this.kill();
    }

    kill() {
        this.ws?.close();
        this.proc.kill();
    }
}
