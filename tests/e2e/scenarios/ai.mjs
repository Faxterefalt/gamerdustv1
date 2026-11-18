// IA al pulsar un botón (criterio 8), con el motor de palabras clave y sin red externa:
// análisis de nodo (HU 45), revisar consecuencias (HU 50), disonancias (HU 56) y "Usar como base" (HU 52).
const PANEL = '[...document.querySelectorAll("aside")].find((a) => /Análisis emocional/.test(a.textContent))';

export default {
    name: 'ai',
    title: 'IA: análisis de nodo, consecuencias, disonancias y "Usar como base"',
    async run({ browser, fixtures, check }) {
        const page = await browser();
        const project = fixtures.project;
        await page.login('test@example.com');

        // ── HU 45: el análisis aparece en el panel del nodo ──
        await page.go(`/projects/${project}/branching?node=${fixtures.node}`);
        await page.waitFor(`!!${PANEL}`);
        await page.eval(`[...${PANEL}.querySelectorAll('button')].find((b) => /Analizar emociones|Reanalizar/.test(b.textContent)).click()`);
        await page.waitFor(`/Reanalizar/.test(${PANEL}.textContent)`, 10000);
        const panel = await page.eval(`${PANEL}.textContent`);
        check('45 el análisis del nodo aparece en su panel', /Tono:/.test(panel) && /Reanalizar/.test(panel), panel.slice(0, 300));

        // ── HU 50: sin clave de Groq, aviso amable (no un error) ──
        await page.click('button', /^\s*Revisar consecuencias\s*$/);
        await page.waitFor('!!document.querySelector("dialog[open]")');
        await page.click('dialog button', /Revisar consecuencias/);
        await page.waitFor('/no está configurada|ocupada/i.test(document.querySelector("dialog[open]").textContent)', 8000);
        check('50 "Revisar consecuencias" responde con un aviso si la IA no está configurada', true);
        await page.eval('document.querySelector("dialog[open] button[aria-label]").click()');

        // ── HU 56 ──
        await page.go(`/projects/${project}/mechanics`);
        await page.waitFor('[...document.querySelectorAll("button")].some((b) => /Detectar disonancias/.test(b.textContent))');
        await page.click('button', /Detectar disonancias/);
        await page.waitFor('!!document.querySelector("dialog[open]")');
        await page.click('dialog button', /Detectar disonancias/);
        await page.waitFor('/no está configurada|ocupada|Contexto insuficiente/i.test(document.querySelector("dialog[open]").textContent)', 8000);
        check('56 "Detectar disonancias" responde', true);

        // ── HU 52: "Usar como base" abre Refinar con la sugerencia como instrucción ──
        await page.go(`/projects/${project}/script`);
        await page.waitFor('!!document.querySelector("textarea[id^=script-block-]")');
        await page.click('[role=toolbar] button', /Analizar emociones/);
        await page.waitFor('[...document.querySelectorAll("button")].some((b) => /Usar como base/.test(b.textContent))', 15000);
        const suggestion = await page.eval('[...document.querySelectorAll("button")].find((x) => /Usar como base/.test(x.textContent)).closest("li").querySelector("p").textContent');
        await page.click('button', /Usar como base/);
        await page.waitFor('!!document.querySelector("dialog[open] textarea")', 5000);
        const instruction = await page.eval('document.querySelector("dialog[open] textarea").value');
        check('52a Refinar se abre con la sugerencia como instrucción', instruction.startsWith(suggestion), { suggestion, instruction });
        check('52b se puede elegir el bloque que refinar', (await page.eval('document.querySelector("dialog[open] select")?.options.length ?? 0')) > 1, null);
    },
};
