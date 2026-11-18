// Recuperar contraseña con MAIL_MAILER=log (HU 1, criterio 10) y reporte de análisis imprimible (HU 57,
// criterio 9). Va el último: cambia la contraseña del usuario de pruebas.
import { sleep } from '../lib/browser.mjs';

export default {
    name: 'account',
    title: 'Cuenta y reportes: recuperar contraseña y reporte de análisis',
    async run({ browser, fixtures, app, check }) {
        const page = await browser();

        // ── HU 1 ──
        await page.go('/login');
        await page.waitFor('[...document.querySelectorAll("a")].some((a) => /Olvidaste/.test(a.textContent))');
        await page.click('a', /Olvidaste/);
        await page.waitFor('location.pathname === "/forgot-password" && !!document.querySelector("input[type=email]")');
        check('1a el login enlaza a "¿Olvidaste tu contraseña?"', true);

        const offset = app.logSize();
        await page.type('input[type=email]', 'test@example.com');
        await page.eval('document.querySelector("form button[type=submit]").click()');
        await page.waitFor('/Si existe una cuenta con ese correo/.test(document.body.innerText)');
        check('1b tras pedirlo, un mensaje genérico', true);

        // El correo llega al log del servidor (quoted-printable: se deshacen los saltos y "=3D").
        let mail = '';
        for (let i = 0; i < 20 && !/reset-password\//.test(mail); i++) {
            await sleep(200);
            mail = app.logSince(offset).replace(/=\r?\n/g, '').replace(/=3D/g, '=');
        }
        const link = mail.match(/reset-password\/([a-f0-9]{64})\?email=([^\s"\])&<]+)/);
        check('1c el correo (MAIL_MAILER=log) trae el enlace', Boolean(link), mail.slice(0, 300));
        check('1d el correo está en español', /¡Hola!/.test(mail) && /Restablecer contraseña/.test(mail), null);

        await page.go(`/reset-password/${link[1]}?email=${link[2]}`);
        await page.waitFor('document.querySelectorAll("input[type=password]").length === 2');
        check('1e la página de restablecer trae el correo', (await page.eval('document.querySelector("input[type=email]").value')) === 'test@example.com', null);
        await page.type('input[type=password]', 'clave-nueva-123', 0);
        await page.type('input[type=password]', 'clave-nueva-123', 1);
        await page.eval('document.querySelector("form button[type=submit]").click()');
        await page.waitFor('location.pathname === "/login" && /Tu contraseña se ha restablecido/.test(document.body.innerText)');
        check('1f vuelve al login con un aviso de éxito', true);

        await page.type('input[type=password]', 'password');
        await page.eval('document.querySelector("form button[type=submit]").click()');
        await page.waitFor('/credenciales|no coinciden/i.test(document.body.innerText)', 8000);
        check('1g la contraseña antigua ya no sirve', true);
        await page.login('test@example.com', 'clave-nueva-123');
        check('1h entra con la contraseña nueva', true);

        // ── HU 57 ──
        await page.go(`/projects/${fixtures.project}/reports`);
        await page.waitFor('[...document.querySelectorAll("a")].some((a) => /reports\\/analysis$/.test(a.href))');
        check('57a Reportes ofrece el reporte de análisis', /Reporte de análisis/.test(await page.text()), null);
        await page.go(`/projects/${fixtures.project}/reports/analysis`);
        const report = await page.text();
        check('57b imprime las métricas emocionales por escena', /Métricas emocionales por escena/.test(report) && /E01/.test(report), report.slice(0, 300));
        check('57c incluye alertas y validaciones por estado', /Alertas rojas y ámbar/.test(report) && /Validaciones de coherencia por estado/.test(report), null);
        check('57d indica la versión analizada', /Versión n\.º \d+/.test(report) && /Versión actual|Desactualizado/.test(report), null);
        check('57e no muestra VAD ni las dimensiones internas', !/\bVAD\b|\bvalencia\b|\bvalence\b|\barousal\b|\bdominance\b/i.test(report), report.match(/\bVAD\b|\bvalencia\b|\bvalence\b|\barousal\b|\bdominance\b/i));
        check('57f sin scroll horizontal', await page.eval('document.documentElement.scrollWidth <= window.innerWidth + 1'), null);
    },
};
