// Los controladores renderizan "Projects/Index" o "Landing"; aquí se traducen a features/<modulo>/pages/<Pagina>.
const pages = import.meta.glob('../features/*/pages/**/*.tsx', { eager: true });

export function resolvePage(name: string) {
    const [first, ...rest] = name.split('/');
    const page = rest.length > 0 ? rest.join('/') : first;
    const path = `../features/${first.toLowerCase()}/pages/${page}.tsx`;

    if (!(path in pages)) {
        throw new Error(`Página Inertia no encontrada: ${name} (${path})`);
    }

    return pages[path];
}
