import { Head, Link } from '@inertiajs/react';
import { LoaderCircle, Sparkles } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import ProjectLayout from '../../../layouts/ProjectLayout';
import { FormError, PageHeading } from '../../../shared/components/ui';
import { api } from '../../../shared/lib/api';
import { __ } from '../../../shared/lib/i18n';
import { card, primarySm } from '../../../shared/lib/styles';
import type { Project } from '../../projects/projects.types';
import AnalysisTabs from '../components/AnalysisTabs';
import type { EmotionCatalog, EmotionTimeline } from '../emotion.types';

// Los gráficos (Recharts) se cargan aparte para no engordar el resto de páginas.
const EvolutionCharts = lazy(() => import('../components/EvolutionCharts'));

interface EvolutionProps {
    project: Project;
    emotionCatalog: EmotionCatalog;
}

function Loading() {
    return (
        <p role="status" className="flex items-center gap-2 text-xs text-primary">
            <LoaderCircle size={14} className="animate-spin" /> {__('Loading…')}
        </p>
    );
}

/**
 * Evolución emocional: arco de la historia (Vista A) y emociones de los personajes (Vista B).
 * Solo lee análisis ya guardados: esta página nunca llama a la IA.
 */
export default function Evolution({ project, emotionCatalog }: EvolutionProps) {
    const [timeline, setTimeline] = useState<EmotionTimeline | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        api<EmotionTimeline>('GET', `/projects/${project.id}/analysis/emotion-timeline`)
            .then(setTimeline)
            .catch(() => setError(__('Could not load the analysis.')));
    }, [project.id]);

    const analyzed = timeline ? timeline.scenes.some((scene) => scene.analyzed) : false;

    return (
        <ProjectLayout>
            <Head title={`${__('Emotional evolution')} - ${project.title}`} />
            <PageHeading title={__('AI Analysis')} description={__('How the emotions of your story and your characters change from scene to scene.')} />
            <AnalysisTabs projectId={project.id} active="evolution" />

            <FormError error={error} />
            {!timeline && !error && <Loading />}

            {timeline && !analyzed && (
                <div className={`${card} mb-6 flex flex-col items-center gap-4 px-6 py-12 text-center`}>
                    <Sparkles size={26} className="text-primary" />
                    <p className="max-w-md text-xs leading-6 text-[#a6b99a]">{__('No scenes analyzed yet. Open a scene in the Script and press Analyze emotions.')}</p>
                    <Link href={`/projects/${project.id}/script`} className={primarySm}>
                        {__('Go to the Script')}
                    </Link>
                </div>
            )}

            {timeline && (timeline.scenes.length > 0 || timeline.characters.length > 0) && (
                <Suspense fallback={<Loading />}>
                    <EvolutionCharts projectId={project.id} timeline={timeline} catalog={emotionCatalog} />
                </Suspense>
            )}
        </ProjectLayout>
    );
}
