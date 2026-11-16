import { __ } from '../../../shared/lib/i18n';
import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { button } from '../../../shared/lib/styles';
import type { Project } from '../projects.types';
import GeneralFields, { validateGeneral } from './GeneralFields';

interface ProjectFormProps {
    project: Project;
}

export default function ProjectForm({ project }: ProjectFormProps) {
    const { data, setData, put, processing, errors, setError, clearErrors, recentlySuccessful } = useForm({
        title: project.title ?? '',
        game_genre: project.game_genre ?? '',
        language: project.language ?? 'es',
        narrative_type: project.narrative_type ?? 'balanced',
        premise: project.premise ?? '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        clearErrors();
        const problems = validateGeneral(data);
        const keys = Object.keys(problems) as (keyof typeof problems)[];
        if (keys.length > 0) {
            keys.forEach((key) => setError(key as 'title', problems[key] as string));
            return;
        }
        put(`/projects/${project.id}`, { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="space-y-5 rounded-xl border border-border bg-[#171d16] p-5">
            <GeneralFields data={data} setData={setData} errors={errors} idPrefix="edit" extraGenre={project.game_genre} />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-xs text-[#98a58e]">
                    <span className="text-primary">*</span> {__('Required fields')}
                </p>
                <div className="flex items-center gap-3">
                    {recentlySuccessful && <span className="text-sm text-emerald-300">{__('Changes saved successfully.')}</span>}
                    <button type="submit" disabled={processing} className={`${button} disabled:opacity-50`}>
                        {processing ? __('Saving...') : __('Save changes')}
                    </button>
                </div>
            </div>
        </form>
    );
}
