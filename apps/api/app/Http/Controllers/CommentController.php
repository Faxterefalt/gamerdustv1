<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CommentController extends Controller
{
    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'text' => ['required', 'string', 'max:2000'],
            'scene_id' => ['nullable', 'integer', Rule::exists('scenes', 'id')->where('project_id', $project->id)],
        ]);

        $project->comments()->create([...$data, 'user_id' => $request->user()->id]);

        // El panel muestra su propio aviso; no se usa flash para no interferir con el editor.
        return back();
    }

    public function destroy(Project $project, Comment $comment): RedirectResponse
    {
        $this->authorize('update', $project);
        abort_unless($comment->project_id === $project->id, 404);

        $comment->delete();

        return back();
    }
}
