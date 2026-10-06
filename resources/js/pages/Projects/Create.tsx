import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, BookOpen, ChevronRight, Sparkles } from 'lucide-react';
import type { FormEvent } from 'react';
import SiteLayout from '../../components/site/SiteLayout';
import { button, field, genres } from '../../lib/styles';

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        game_genre: 'Aventura',
        language: 'Español',
        description: '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        post('/projects');
    };

    return (
        <SiteLayout>
            <Head title="Crear proyecto" />
            <div className="mx-auto min-h-[78vh] max-w-[1400px] px-6 py-10 lg:px-16">
                <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs text-[#89967f]">
                    <Link href="/projects" className="hover:text-primary">
                        Mis proyectos
                    </Link>
                    <ChevronRight size={13} />
                    <span className="text-[#c1c8bc]">Crear proyecto</span>
                </nav>

                <section className="mx-auto mt-10 max-w-[720px] pb-12">
                    <span className="flex items-center gap-2 font-mono text-[10px] tracking-[.14em] text-primary">
                        <Sparkles size={14} /> EL PRIMER CAPÍTULO DE TU UNIVERSO
                    </span>
                    <h1 className="mt-4 font-display text-3xl font-medium sm:text-4xl">Crear proyecto narrativo</h1>
                    <p className="mt-3 text-sm leading-6 text-[#98a58e]">
                        Dale un nombre a tu idea. Este es el comienzo de un mundo que solo tú puedes imaginar.
                    </p>

                    <form onSubmit={submit} className="mt-8 rounded-xl border border-border bg-[#171d16] p-6 sm:p-8">
                        <label className="block text-sm" htmlFor="project-name">
                            Nombre del proyecto <span className="text-primary">*</span>
                        </label>
                        <input
                            id="project-name"
                            required
                            autoFocus
                            maxLength={255}
                            value={data.title}
                            onChange={(event) => setData('title', event.target.value)}
                            placeholder="Ej. El último faro"
                            className={field}
                        />
                        {errors.title && <p className="mt-2 text-sm text-[#f0b4a0]">{errors.title}</p>}

                        <div className="mt-6 grid gap-6 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm" htmlFor="project-genre">
                                    Género <span className="text-primary">*</span>
                                </label>
                                <select id="project-genre" required value={data.game_genre} onChange={(event) => setData('game_genre', event.target.value)} className={field}>
                                    {genres.map((option) => (
                                        <option key={option}>{option}</option>
                                    ))}
                                </select>
                                {errors.game_genre && <p className="mt-2 text-sm text-[#f0b4a0]">{errors.game_genre}</p>}
                            </div>
                            <div>
                                <label className="block text-sm" htmlFor="project-language">
                                    Idioma del proyecto <span className="text-primary">*</span>
                                </label>
                                <select id="project-language" required value={data.language} onChange={(event) => setData('language', event.target.value)} className={field}>
                                    {['Español', 'English'].map((option) => (
                                        <option key={option}>{option}</option>
                                    ))}
                                </select>
                                {errors.language && <p className="mt-2 text-sm text-[#f0b4a0]">{errors.language}</p>}
                            </div>
                        </div>

                        <label htmlFor="project-description" className="mt-6 block text-sm">
                            Descripción general <span className="ml-2 text-xs text-[#74816b]">Opcional</span>
                        </label>
                        <textarea
                            id="project-description"
                            rows={5}
                            maxLength={5000}
                            value={data.description}
                            onChange={(event) => setData('description', event.target.value)}
                            placeholder="Ej. Una exploradora busca el origen de una señal. ¿Qué está en juego en tu historia?"
                            className={`${field} resize-y leading-7`}
                        />
                        {errors.description && <p className="mt-2 text-sm text-[#f0b4a0]">{errors.description}</p>}

                        <div className="mt-7 flex flex-wrap items-center justify-between gap-5 border-t border-border pt-6">
                            <p className="text-xs text-[#98a58e]">
                                <span className="text-primary">*</span> Campos obligatorios
                            </p>
                            <div className="flex gap-3">
                                <Link href="/projects" className="inline-flex items-center justify-center rounded-md border border-border px-5 py-3 text-sm transition hover:border-primary/50">
                                    Cancelar
                                </Link>
                                <button type="submit" disabled={processing} className={`${button} disabled:opacity-50`}>
                                    Crear proyecto <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    </form>
                    <p className="mt-5 flex items-center justify-center gap-2 text-[11px] text-[#74816b]">
                        <BookOpen size={13} /> Tu historia te pertenece. Guardada en tu servidor.
                    </p>
                </section>
            </div>
        </SiteLayout>
    );
}
