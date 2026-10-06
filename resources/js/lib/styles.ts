export const button =
    'inline-flex items-center justify-center gap-3 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-[#172012] transition hover:bg-[#d3f3aa] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary';

export const field =
    'mt-2 w-full rounded-md border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10';

export const genres = ['Aventura', 'Fantasía oscura', 'Ciencia ficción', 'Misterio', 'Terror', 'Otro'];

const images = {
    forest: 'https://images.unsplash.com/photo-1483982258113-b72862e6cff6?auto=format&fit=crop&w=1600&q=85',
    mountain: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=85',
    desert: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1000&q=85',
};

export const imageForGenre = (genre?: string | null) =>
    genre === 'Ciencia ficción' ? images.desert : genre === 'Aventura' ? images.mountain : images.forest;
