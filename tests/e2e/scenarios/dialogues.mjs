// HU 18/19/22/23 (criterio 3): el reproductor evalúa condiciones y efectos de Cumbre Muda en
// "Probar recorrido" del editor y en el HTML exportado sin conexión, y probar no escribe en la BD.

/**
 * Se ejecuta dentro del reproductor: juega varios recorridos y devuelve lo que vio.
 * "Hacer la guardia sola" exige confianza_cordada >= 1, que sube con "Sentarte a su lado en silencio".
 */
function playCumbre() {
    const buttons = () => [...document.querySelectorAll('#play-view .choices button, #play-view .text button.link')];
    const label = (button) => (button.firstChild ? button.firstChild.textContent : button.textContent).trim();
    const labels = () => buttons().map(label);
    const choose = (text) => {
        const button = buttons().find((candidate) => label(candidate) === text);
        if (!button) throw new Error(`No hay opción "${text}" en "${title()}". Opciones: ${labels().join(' | ')}`);
        button.click();
    };
    const action = (text) => [...document.querySelectorAll('#play-view .actions button')].find((button) => button.textContent.includes(text))?.click();
    const title = () => document.querySelector('#play-view .passage h2')?.textContent ?? null;
    const vars = () => document.querySelector('#play-view .vars')?.textContent ?? '';

    document.getElementById('tab-play')?.click();
    const result = { start: title() };

    choose('Dejar a Tomás a solas con su duelo');
    choose('Sentarte a su lado en silencio');
    result.withTrust = { title: title(), options: labels(), vars: vars() };

    action('Reiniciar');
    result.afterReset = { title: title(), vars: vars() };
    choose('Pedir a Lucía el parte meteorológico');
    choose('Anotar la ventana de calma y seguir');
    result.withoutTrust = { title: title(), options: labels() };

    action('Reiniciar');
    for (const option of ['Dejar a Tomás a solas con su duelo', 'Sentarte a su lado en silencio', 'Hacer la guardia sola', 'Esconder el cabo y esperar', 'Seguir adelante con el secreto', 'Esperar a que Lucía vuelva', 'Pacto de silencio']) {
        choose(option);
    }
    result.final = { title: title(), ending: document.querySelector('#play-view .ending')?.textContent ?? null, vars: vars() };

    return result;
}

function checkPlay(check, where, play) {
    check(`${where}: empieza en el nodo de inicio declarado`, play.start === 'Llegada a la sala común', play.start);
    check(`${where}: con confianza aparece "Hacer la guardia sola"`, play.withTrust.options.includes('Hacer la guardia sola') && /confianza_cordada\s*1/.test(play.withTrust.vars), play.withTrust);
    check(`${where}: Reiniciar vuelve al inicio y a los valores iniciales`, play.afterReset.title === 'Llegada a la sala común' && /confianza_cordada\s*0/.test(play.afterReset.vars), play.afterReset);
    check(`${where}: sin confianza la opción no aparece`, play.withoutTrust.title === 'Reparto de guardias' && !play.withoutTrust.options.includes('Hacer la guardia sola'), play.withoutTrust);
    check(`${where}: llega a un final declarado con los efectos aplicados una vez`, play.final.title === 'Pacto de silencio' && Boolean(play.final.ending) && /cabo_escondido\s*verdadero/.test(play.final.vars) && /confianza_lucia\s*-3/.test(play.final.vars), play.final);
}

export default {
    name: 'dialogues',
    title: 'Diálogos: Probar recorrido y HTML jugable sin conexión',
    async run({ browser, fixtures, app, check }) {
        const page = await browser();
        const project = fixtures.project;
        await page.login('test@example.com');

        const graph = () => page.eval(`fetch('/projects/${project}/branching/graph', { headers: { Accept: 'application/json' } }).then((response) => response.text())`);
        const before = await graph();

        // El botón del editor abre el reproductor en un iframe.
        await page.go(`/projects/${project}/branching`);
        await page.waitFor('[...document.querySelectorAll("button")].some((b) => /Probar recorrido/.test(b.textContent))');
        await page.click('button', /Probar recorrido/);
        await page.waitFor('!!document.querySelector("iframe[src*=playtest]")');
        check('el editor abre "Probar recorrido"', true);

        await page.go(`/projects/${project}/branching/playtest`);
        await page.waitFor('!!document.getElementById("play-view")');
        checkPlay(check, 'Probar recorrido', await page.eval(`(${playCumbre.toString()})()`));
        check('probar no modifica la BD (grafo idéntico)', (await graph()) === before, null);

        // HTML exportado abierto desde disco: sin scripts ni hojas externas.
        await page.go(`file:///${app.exportFile.replace(/\\/g, '/')}`);
        await page.waitFor('!!document.getElementById("play-view")');
        const external = await page.eval('[...document.querySelectorAll("script[src], link[href], img[src^=http]")].map((el) => el.outerHTML)');
        check('el HTML exportado no carga nada de la red', external.length === 0, external);
        checkPlay(check, 'HTML exportado', await page.eval(`(${playCumbre.toString()})()`));
    },
};
