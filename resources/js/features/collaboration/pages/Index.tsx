import { Head } from '@inertiajs/react';
import { Lock, Users } from 'lucide-react';
import useProjectAccess from '../../../shared/hooks/useProjectAccess';
import ProjectLayout from '../../../layouts/ProjectLayout';
import { PageHeading } from '../../../shared/components/ui';
import { __ } from '../../../shared/lib/i18n';
import { card } from '../../../shared/lib/styles';
import type { Project } from '../../projects/projects.types';
import type { MemberRole, ProjectComment, ProjectMemberRow } from '../collaboration.types';
import CommentsPanel from '../components/CommentsPanel';
import MembersPanel, { ROLE_LABELS } from '../components/MembersPanel';

interface CollaborationProps {
    project: Project;
    comments: ProjectComment[];
    members: ProjectMemberRow[];
    roles: MemberRole[];
}

export default function Index({ project, comments, members, roles }: CollaborationProps) {
    const authors = [...new Set(comments.map((comment) => comment.author))];
    const access = useProjectAccess();
    const shared = members.length > 1;

    return (
        <ProjectLayout>
            <Head title={`${__('Collaboration')} - ${project.title}`} />
            <PageHeading title={__('Collaboration')} description={__('Another perspective, a new possibility. Gather the conversations of your story.')} />

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                <section className={`${card} p-5 sm:p-7`}>
                    <h2 className="mb-6 font-bold text-lg">
                        {__('Project conversations')} <span className="ml-2 text-xs text-primary">{comments.length}</span>
                    </h2>
                    <CommentsPanel projectId={project.id} comments={comments} />
                </section>

                <aside className="space-y-5">
                    <MembersPanel projectId={project.id} members={members} roles={roles} />
                    <div className={`${card} p-6`}>
                        <Lock size={23} className="text-primary" />
                        <h2 className="mt-4 font-bold text-lg">{shared ? __('A shared project') : __('A private project')}</h2>
                        <p className="mt-3 text-xs leading-7 text-muted">
                            {shared
                                ? __('Only the people in the team can see this project and its comments.')
                                : __('For now only your account can see this project and its comments. Use them as notes on scenes and ideas to revisit.')}
                        </p>
                        {access.role && <p className="mt-3 text-xs leading-6 text-muted">{__('Your role: :role', { role: __(ROLE_LABELS[access.role]) })}</p>}
                        <p className="mt-3 text-xs leading-6 text-muted">{__('Comments on a scene also appear in the Script editor, in the Comments tab.')}</p>
                    </div>
                    <div className={`${card} p-6`}>
                        <h2 className="flex items-center gap-2 font-bold text-base">
                            <Users size={17} className="text-primary" /> {__('Voices in the conversation')}
                        </h2>
                        <div className="mt-4 space-y-3">
                            {authors.map((author) => (
                                <p key={author} className="flex items-center gap-3 text-xs text-muted">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">{author.slice(0, 2).toUpperCase()}</span>
                                    {author}
                                </p>
                            ))}
                        </div>
                        {!authors.length && <p className="mt-4 text-xs text-muted">{__('Your comment can be the first.')}</p>}
                    </div>
                </aside>
            </div>
        </ProjectLayout>
    );
}
