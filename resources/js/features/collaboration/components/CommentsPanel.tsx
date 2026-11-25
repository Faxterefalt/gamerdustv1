import { router, useForm, usePage } from '@inertiajs/react';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { FormError, Pending } from '../../../shared/components/ui';
import useProjectAccess from '../../../shared/hooks/useProjectAccess';
import { __, locale } from '../../../shared/lib/i18n';
import { field, primarySm } from '../../../shared/lib/styles';
import type { PageProps } from '../../projects/projects.types';
import type { ProjectComment } from '../collaboration.types';

interface CommentsPanelProps {
    projectId: number;
    comments: ProjectComment[];
    /** Si se indica, solo muestra y publica comentarios de esa escena. */
    sceneId?: number;
    compact?: boolean;
}

/**
 * Lista y formulario de comentarios. Recarga solo la prop `comments`, así no reinicia el estado
 * de la página que lo contiene (p. ej. los borradores del editor de guion).
 */
export default function CommentsPanel({ projectId, comments, sceneId, compact = false }: CommentsPanelProps) {
    const [sent, setSent] = useState(false);
    const access = useProjectAccess();
    const userId = usePage<PageProps>().props.auth.user?.id;
    const form = useForm({ text: '', scene_id: sceneId ?? null });
    const visible = sceneId === undefined ? comments : comments.filter((comment) => comment.scene_id === sceneId);
    const reload = { preserveScroll: true, preserveState: true, only: ['comments'] };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setSent(false);
        form.post(`/projects/${projectId}/comments`, {
            ...reload,
            onSuccess: () => {
                form.reset('text');
                setSent(true);
            },
        });
    };

    const destroy = (comment: ProjectComment) => {
        if (confirm(__('Delete this comment?'))) {
            router.delete(`/projects/${projectId}/comments/${comment.id}`, reload);
        }
    };

    return (
        <div>
            <div className={compact ? 'space-y-5' : 'space-y-4'}>
                {!visible.length && (
                    <div className="rounded-lg border border-dashed border-border px-5 py-8 text-center">
                        <MessageSquare size={22} className="mx-auto text-[#90a680]" />
                        <p className="mt-3 text-xs leading-6 text-[#a5b69a]">
                            {__('The conversation starts here.')}
                            <br />
                            {sceneId === undefined ? __('Share an idea about the project.') : __('Share an idea about this scene.')}
                        </p>
                    </div>
                )}
                {visible.map((comment) => (
                    <article key={comment.id} className={`rounded-lg border border-border bg-background/30 ${compact ? 'p-3.5' : 'p-5'}`}>
                        <div className="flex items-start gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-xs text-primary">
                                {comment.author.slice(0, 2).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                                <h3 className="break-words text-xs font-medium">{comment.author}</h3>
                                <p className="mt-1 text-[9px] text-[#97a98b]">
                                    {comment.created_at &&
                                        new Date(comment.created_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    {sceneId === undefined && comment.scene_title ? ` · ${comment.scene_title}` : ''}
                                </p>
                            </div>
                            {access.can_update && (comment.user_id === userId || access.can_manage) && (
                                <button type="button" onClick={() => destroy(comment)} aria-label={__('Delete comment')} className="rounded p-1 text-[#7f9174] hover:text-rose-300">
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                        <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-7 text-[#bac9af]">{comment.text}</p>
                    </article>
                ))}
            </div>

            {!access.can_update ? (
                <p className="mt-6 border-t border-border pt-5 text-[11px] text-[#9eb392]">{__('You have read-only access: you cannot comment on this project.')}</p>
            ) : (
            <form className="mt-6 border-t border-border pt-5" onSubmit={submit}>
                <fieldset disabled={form.processing}>
                    <label className="block text-[11px] text-[#b7c6ab]">
                        {__('Comment')}
                        <textarea
                            required
                            rows={compact ? 3 : 4}
                            maxLength={2000}
                            value={form.data.text}
                            onChange={(event) => {
                                form.setData('text', event.target.value);
                                setSent(false);
                            }}
                            placeholder={__('An observation, an idea, another possibility…')}
                            className={`${field} resize-y !text-xs leading-6`}
                        />
                    </label>
                    <FormError error={form.errors.text ?? form.errors.scene_id} />
                    <button type="submit" className={`${primarySm} mt-4 ${compact ? 'w-full' : ''}`}>
                        <Pending pending={form.processing}>
                            <Send size={13} /> {__('Post comment')}
                        </Pending>
                    </button>
                    {sent && (
                        <p role="status" className="mt-3 text-xs text-primary">
                            {__('Comment posted.')}
                        </p>
                    )}
                </fieldset>
            </form>
            )}
        </div>
    );
}
