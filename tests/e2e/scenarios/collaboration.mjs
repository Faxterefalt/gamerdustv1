// Colaboración con dos navegadores (HU 5 y 26, criterio 11): invitar, lista de compartidos, aviso de quién
// edita, conflicto 409 con sus tres salidas, lector de solo lectura y miembro retirado sin acceso.
import { sleep } from '../lib/browser.mjs';

const BLOCK = 'textarea[id^=script-block-]';

export default {
    name: 'collaboration',
    title: 'Colaboración: roles, aviso de edición y conflicto al guardar',
    async run({ browser, fixtures, check }) {
        const owner = await browser();
        const other = await browser();
        const project = fixtures.project;

        // Una usuaria nueva se registra (las invitaciones son para cuentas existentes).
        await other.go('/register');
        await other.waitFor('document.querySelectorAll("form input").length >= 4');
        for (const [index, value] of ['Nora', 'nora@example.com', 'clave-de-nora', 'clave-de-nora'].entries()) {
            await other.type('form input', value, index);
        }
        await other.eval('document.querySelector("form button[type=submit]").click()');
        await other.waitFor('location.pathname.startsWith("/projects")', 15000);
        check('5a una cuenta nueva puede registrarse', true);

        // ── HU 5: la dueña invita ──
        await owner.login('test@example.com');
        await owner.go(`/projects/${project}/collaboration`);
        await owner.waitFor('/Equipo/.test(document.body.innerText)');
        const invite = async (email, role) => {
            await owner.type('form input[type=email]', email);
            await owner.eval(`(() => { const s = [...document.querySelectorAll('form select')].at(-1); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, '${role}'); s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
            await owner.click('form button[type=submit]', /Invitar/);
            await sleep(900);
        };
        await invite('nadie@example.com', 'viewer');
        check('5b un correo sin cuenta da un error claro', /No hay ninguna cuenta de Gamerdust con ese correo/.test(await owner.text()), null);
        await invite('nora@example.com', 'editor');
        check('5c la invitada aparece en el equipo', /nora@example\.com/.test(await owner.text()) && /Nora ya tiene acceso al proyecto/.test(await owner.text()), null);

        await other.go('/projects');
        const list = await other.text();
        check('5d su lista incluye el proyecto compartido con dueño y rol', /Compartido por .* Editor/.test(list), list.slice(0, 400));

        // ── HU 26: aviso de quién edita ──
        await other.go(`/projects/${project}/script`);
        await other.waitFor(`!!document.querySelector("${BLOCK}")`);
        await sleep(600);
        await owner.go(`/projects/${project}/script`);
        await owner.waitFor(`!!document.querySelector("${BLOCK}")`);
        await owner.waitFor('/Nora está editando esta escena/.test(document.body.innerText)', 8000);
        check('26a la dueña ve que Nora está editando la escena', true);

        // Conflicto: Nora guarda primero; la dueña, con la versión antigua, después.
        const save = (page) => page.click('button', /^\s*Guardar\s*$/);
        await other.type(BLOCK, 'Texto de Nora.');
        await save(other);
        await other.waitFor('/Escena guardada/.test(document.body.innerText)', 8000);

        await owner.type(BLOCK, 'Texto de la dueña.');
        await save(owner);
        await owner.waitFor('/Esta escena cambió mientras la editabas/.test(document.body.innerText)', 8000);
        check('26b el 409 abre el diálogo y dice quién guardó', /Nora guardó esta escena/.test(await owner.text()), null);
        await owner.click('button', /Ver cambios del otro/);
        await owner.waitFor('/De tu versión a la guardada/.test(document.body.innerText)');
        check('26c "Ver cambios del otro" muestra la comparación', /modificado|añadido|eliminado/i.test(await owner.text()), null);
        await owner.click('button', /Sobrescribir/);
        await owner.waitFor('/Escena guardada/.test(document.body.innerText) && !/Esta escena cambió mientras/.test(document.body.innerText)', 8000);
        check('26d "Sobrescribir" guarda la versión propia', true);

        // Nora vuelve a guardar sobre una versión ya superada (en el mismo segundo también: version_id).
        await other.type(BLOCK, 'Segunda versión de Nora.');
        await save(other);
        await other.waitFor('/Esta escena cambió mientras la editabas/.test(document.body.innerText)', 8000);
        check('26e un segundo guardado sobre una versión superada también da conflicto', true);
        await other.click('button', /Copiar mi versión/);
        await other.waitFor('/versión guardada/i.test(document.body.innerText) && !document.querySelector("dialog[open]")', 8000);
        check('26f "Copiar mi versión" carga la versión guardada', (await other.eval(`document.querySelector("${BLOCK}").value`)) === 'Texto de la dueña.', await other.eval(`document.querySelector("${BLOCK}").value`));
        await other.eval('document.querySelector(\'button[aria-label="Deshacer"]\').click()');
        await sleep(300);
        check('26g Deshacer recupera la versión propia', (await other.eval(`document.querySelector("${BLOCK}").value`)) === 'Segunda versión de Nora.', await other.eval(`document.querySelector("${BLOCK}").value`));

        // ── Lector del seeder: solo lectura ──
        await other.logout();
        await other.login('lector@example.com');
        await other.go(`/projects/${project}/collaboration`);
        await other.waitFor('/Equipo/.test(document.body.innerText)');
        const reader = await other.text();
        check('11a el lector ve el aviso de solo lectura', /Acceso de solo lectura/.test(reader), reader.slice(0, 200));
        check('11b el lector no puede invitar ni comentar', !(await other.eval('[...document.querySelectorAll("button")].some((b) => /^\\s*Invitar\\s*$/.test(b.textContent))')) && /no puedes comentar/.test(reader), null);
        check('11c el lector recibe 403 al escribir (JSON)', (await other.status('POST', `/projects/${project}/branching/nodes`, { title: 'X' })) === 403, null);

        // ── Retirar al lector ──
        await owner.go(`/projects/${project}/collaboration`);
        await owner.waitFor('/Equipo/.test(document.body.innerText)');
        await owner.click('button', /Retirar a Bruno/);
        await owner.waitFor('/ya no tiene acceso al proyecto/.test(document.body.innerText)', 8000);
        check('11d el miembro retirado pierde el acceso', (await other.eval(`fetch('/projects/${project}').then((r) => r.status)`)) === 403, null);
        check('la página de colaboración no tiene scroll horizontal', await owner.eval('document.documentElement.scrollWidth <= window.innerWidth + 1'), null);
    },
};
