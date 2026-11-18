// Editor de guion: autoguardado local y recuperación (HU 24, criterio 5), auto-formato (HU 14, criterio 7),
// comparar versiones (HU 25, criterio 6) y participación del personaje en ramas (HU 16).
import { sleep } from '../lib/browser.mjs';

const DRAFTS = 'Object.keys(localStorage).filter((k) => k.startsWith("gamerdust:script-draft:")).length';

export default {
    name: 'script',
    title: 'Guion: borradores locales, auto-formato, versiones y ramas del personaje',
    async run({ browser, fixtures, check }) {
        const page = await browser();
        const script = `/projects/${fixtures.project}/script`;
        await page.login('test@example.com');

        // ── HU 24: autoguardado local y recuperación ──
        await page.go(script);
        await page.waitFor('!!document.querySelector("textarea[id^=script-block-]")');
        const firstId = await page.eval('document.querySelector("textarea[id^=script-block-]").id');
        const focusEnd = (id) => page.eval(`(() => { const el = document.getElementById(${JSON.stringify(id)}); el.focus(); el.setSelectionRange(el.value.length, el.value.length); })()`);
        const value = (id) => page.eval(`document.getElementById(${JSON.stringify(id)})?.value ?? null`);

        await focusEnd(firstId);
        await page.send('Input.insertText', { text: ' MARCA-E2E' });
        await sleep(1200);
        const status = await page.eval('document.querySelector("[role=status]")?.textContent');
        check('24a el borrador se copia al navegador tras el debounce', (await page.eval(DRAFTS)) === 1, null);
        check('24b el indicador dice "sin guardar" y que está en el navegador', /sin guardar/i.test(status) && /navegador/i.test(status), status);

        // "Cerrar la pestaña" con cambios: se recarga (beforeunload aceptado).
        await page.go(script);
        await page.waitFor('!!document.querySelector("textarea[id^=script-block-]")');
        const banner = await page.eval('document.querySelector("[role=alert]")?.textContent ?? null');
        check('24c al volver se ofrece recuperar el borrador', /borrador sin guardar/i.test(banner ?? ''), banner);
        check('24d sin recuperar, el editor muestra lo guardado', !(await value(firstId))?.includes('MARCA-E2E'), await value(firstId));
        await page.click('[role=alert] button', /Recuperar/);
        await sleep(300);
        check('24e "Recuperar borrador" lo restaura', (await value(firstId))?.includes('MARCA-E2E'), await value(firstId));

        await page.go(script);
        await page.waitFor('!!document.querySelector("[role=alert]")');
        await page.click('[role=alert] button', /Descartar/);
        await sleep(300);
        await page.go(script);
        await page.waitFor('!!document.querySelector("textarea[id^=script-block-]")');
        check('24f un borrador descartado no reaparece', await page.eval('!document.querySelector("[role=alert]")'), null);

        // ── HU 14: auto-formato ──
        const labels = () => page.eval('[...document.querySelectorAll("textarea[id^=script-block-]")].map((t) => t.getAttribute("aria-label"))');
        const lastBlock = () => page.eval('[...document.querySelectorAll("textarea[id^=script-block-]")].at(-1).id');
        const pressEnter = async () => {
            await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
            await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
            await sleep(250);
        };

        const countBefore = (await labels()).length;
        await focusEnd(await lastBlock());
        await page.click('[role=toolbar] button', /^\s*Acción\s*$/);
        await sleep(250);
        const actionId = await page.eval('document.activeElement.id');
        await page.send('Input.insertText', { text: 'IRENE' });
        await sleep(250);
        const converted = await page.eval(`document.getElementById(${JSON.stringify(actionId)}).getAttribute("aria-label")`);
        check('14a una línea en MAYÚSCULAS con un personaje de la escena pasa a PERSONAJE', /^Personaje/.test(converted), converted);

        await focusEnd(actionId);
        await pressEnter();
        const next = await page.eval('document.activeElement.getAttribute("aria-label")');
        check('14b Enter tras PERSONAJE crea un bloque de DIÁLOGO', /^Diálogo/.test(next ?? ''), next);
        await page.send('Input.insertText', { text: 'No hay cuerda.' });
        await pressEnter();
        const third = await page.eval('document.activeElement.getAttribute("aria-label")');
        check('14c Enter tras DIÁLOGO crea ACCIÓN', /^Acción/.test(third ?? ''), third);
        check('14d se añadieron tres bloques', (await labels()).length === countBefore + 3, await labels());

        await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'z', code: 'KeyZ', windowsVirtualKeyCode: 90, modifiers: 2 });
        await sleep(200);
        check('14e Ctrl+Z deshace el último bloque creado', (await labels()).length === countBefore + 2, await labels());

        // ── HU 24: con el servidor caído nunca dice "guardado" ──
        let failNext = true;
        await page.send('Fetch.enable', { patterns: [{ urlPattern: '*/script/scenes/*' }] });
        page.on((message) => {
            if (message.method !== 'Fetch.requestPaused') return;
            if (failNext && message.params.request.method === 'PUT') page.send('Fetch.failRequest', { requestId: message.params.requestId, errorReason: 'ConnectionRefused' });
            else page.send('Fetch.continueRequest', { requestId: message.params.requestId });
        });
        const save = () => page.click('[role=toolbar] button', /^\s*Guardar\s*$/);
        await save();
        await sleep(1200);
        const failedStatus = await page.eval('document.querySelector("[role=status]")?.textContent');
        check('24g servidor caído: el indicador muestra el error y no "guardado"', /servidor falló/i.test(failedStatus) && !/Todo guardado/.test(failedStatus), failedStatus);
        check('24h el borrador sigue en el navegador tras el fallo', (await page.eval(DRAFTS)) === 1, null);
        failNext = false;
        await save();
        await sleep(1500);
        const okStatus = await page.eval('document.querySelector("[role=status]")?.textContent');
        check('24i con el servidor de vuelta se guarda y se limpia el borrador', /Todo guardado/.test(okStatus) && (await page.eval(DRAFTS)) === 0, okStatus);
        await page.send('Fetch.disable');

        // ── HU 25: comparar versiones (un bloque modificado y uno nuevo sobre lo guardado) ──
        await focusEnd(firstId);
        await page.send('Input.insertText', { text: ' (editado)' });
        await focusEnd(await lastBlock());
        await pressEnter();
        await page.send('Input.insertText', { text: 'Bloque nuevo.' });
        await sleep(200);

        await page.click('[role=toolbar] button', /Versiones/);
        await page.waitFor('!!document.querySelector("dialog select")', 8000);
        await page.type('dialog select', 'current');
        await sleep(300);
        const summary = await page.eval('document.querySelector("dialog ol")?.previousElementSibling?.textContent ?? null');
        const marks = await page.eval('[...document.querySelectorAll("dialog ol li")].map((li) => li.querySelector("span").textContent).filter((t) => /Añadido|Eliminado|Modificado|Movido/.test(t))');
        check('25a comparar con el borrador marca el bloque añadido y el modificado', /1 añadido/.test(summary ?? '') && /1 modificado/.test(summary ?? '') && marks.length === 2, { summary, marks });

        const hasRevision = await page.eval(`(() => { const s = document.querySelector('dialog select'); const v = [...s.options].find((o) => /Revisión/.test(o.textContent)); if (!v) return false; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, v.value); s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
        await sleep(300);
        const between = await page.eval('document.querySelector("dialog ol")?.previousElementSibling?.textContent ?? null');
        check('25b también compara dos versiones guardadas', hasRevision && /añadido/.test(between ?? '') && /eliminado/.test(between ?? ''), between);

        // ── HU 16: la ficha del personaje enlaza sus nodos de diálogo ──
        await page.go(`/projects/${fixtures.project}/characters?character=${fixtures.marcos}`);
        await page.waitFor('document.body.textContent.includes("Diálogos ramificados")');
        const nodeLinks = await page.eval('[...document.querySelectorAll("a[href*=\\"/branching?node=\\"]")].map((a) => a.textContent.trim())');
        check('16a la ficha lista los nodos donde habla el personaje', nodeLinks.includes('Marcos esquiva la pregunta'), nodeLinks);
        await page.eval('document.querySelector("a[href*=\\"/branching?node=\\"]").click()');
        await page.waitFor('location.pathname.endsWith("/branching") && !!document.querySelector("aside h2")', 10000);
        check('16b el enlace abre ese nodo en el editor', (await page.eval('document.querySelector("aside h2").textContent')) === nodeLinks[0], await page.eval('document.querySelector("aside h2")?.textContent'));
    },
};
