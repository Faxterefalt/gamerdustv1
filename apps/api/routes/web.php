<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BibleEntryController;
use App\Http\Controllers\BranchingGraphController;
use App\Http\Controllers\CharacterController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\CostEstimationController;
use App\Http\Controllers\DialogueNodeController;
use App\Http\Controllers\EmotionalAnalysisController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\LoreEntryController;
use App\Http\Controllers\MechanicController;
use App\Http\Controllers\NarrativeValidationController;
use App\Http\Controllers\ProjectConstraintController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\SceneController;
use App\Http\Controllers\ScriptController;
use App\Http\Controllers\StudioController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('Landing'));

Route::get('locale/{locale}', LocaleController::class)->name('locale.update');

Route::middleware('guest')->group(function (): void {
    Route::get('login', [AuthController::class, 'create'])->name('login');
    Route::post('login', [AuthController::class, 'store'])->name('login.store');
    Route::get('register', [AuthController::class, 'register'])->name('register');
    Route::post('register', [AuthController::class, 'storeRegistration'])->name('register.store');
});

Route::post('logout', [AuthController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');

Route::middleware(['auth', 'verified'])->group(function (): void {
    Route::get('account', [AccountController::class, 'edit'])->name('account.edit');
    Route::put('account/profile', [AccountController::class, 'updateProfile'])->name('account.profile.update');
    Route::put('account/password', [AccountController::class, 'updatePassword'])->name('account.password.update');

    Route::patch('projects/{project}/favorite', [ProjectController::class, 'toggleFavorite'])
        ->name('projects.favorite');
    Route::resource('projects', ProjectController::class);

    Route::post('projects/{project}/constraints', [ProjectConstraintController::class, 'store'])
        ->name('projects.constraints.store');
    Route::put('projects/{project}/constraints', [ProjectConstraintController::class, 'store'])
        ->name('projects.constraints.update');

    Route::resource('projects.lore', LoreEntryController::class)
        ->parameters(['lore' => 'loreEntry'])
        ->except(['show']);

    // Personajes: create/edit redirigen a la ficha del índice; la imagen se sirve desde el disco privado.
    Route::get('projects/{project}/characters/{character}/image', [CharacterController::class, 'image'])
        ->name('projects.characters.image');
    Route::resource('projects.characters', CharacterController::class)
        ->except(['show']);

    Route::resource('projects.scenes', SceneController::class)
        ->except(['show']);

    Route::resource('projects.dialogues', DialogueNodeController::class)
        ->parameters(['dialogues' => 'dialogue'])
        ->except(['show']);

    Route::controller(BranchingGraphController::class)
        ->prefix('projects/{project}/branching')
        ->name('projects.branching.')
        ->group(function (): void {
            Route::get('/', 'index')->name('index');
            Route::get('graph', 'graph')->name('graph');
            Route::post('nodes', 'storeNode')->name('nodes.store');
            Route::put('nodes/{node}', 'updateNode')->name('nodes.update');
            Route::delete('nodes/{node}', 'destroyNode')->name('nodes.destroy');
            Route::put('positions', 'positions')->name('positions');
            Route::post('nodes/{node}/options', 'storeOption')->name('options.store');
            Route::put('options/{option}', 'updateOption')->name('options.update');
            Route::delete('options/{option}', 'destroyOption')->name('options.destroy');
            Route::get('nodes/{node}/context', 'context')->name('nodes.context');
            Route::post('nodes/{node}/analysis', 'analyze')->name('nodes.analysis');
        });

    // Estudio del proyecto (secciones del sidebar).
    Route::prefix('projects/{project}')->name('projects.')->group(function (): void {
        Route::get('bible', [StudioController::class, 'bible'])->name('bible');

        // Fichas de la Biblia: lugares y reglas del mundo.
        Route::controller(BibleEntryController::class)
            ->prefix('bible/{kind}')
            ->name('bible.')
            ->where(['kind' => implode('|', array_keys(BibleEntryController::KINDS))])
            ->group(function (): void {
                Route::get('/', 'index')->name('index');
                Route::post('/', 'store')->name('store');
                Route::put('{loreEntry}', 'update')->name('update');
                Route::delete('{loreEntry}', 'destroy')->name('destroy');
            });
        Route::get('analysis', [StudioController::class, 'analysis'])->name('analysis');
        Route::get('collaboration', [StudioController::class, 'collaboration'])->name('collaboration');
        Route::get('reports', [StudioController::class, 'reports'])->name('reports');
        Route::get('reports/markdown', [StudioController::class, 'markdown'])->name('reports.markdown');

        Route::resource('mechanics', MechanicController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::resource('comments', CommentController::class)->only(['store', 'destroy']);

        // Editor de guion: index es Inertia, el resto JSON.
        Route::controller(ScriptController::class)->prefix('script')->name('script.')->group(function (): void {
            Route::get('/', 'index')->name('index');
            Route::get('print', 'print')->name('print');
            Route::post('scenes', 'storeScene')->name('scenes.store');
            Route::put('scenes/{scene}', 'updateScene')->name('scenes.update');
            Route::get('scenes/{scene}/versions', 'versions')->name('versions.index');
            Route::post('scenes/{scene}/versions/{version}/restore', 'restoreVersion')->name('versions.restore');
        });
    });

    Route::get('projects/{project}/emotional-analysis', [EmotionalAnalysisController::class, 'index'])
        ->name('projects.emotional-analysis.index');
    Route::post('projects/{project}/emotional-analysis', [EmotionalAnalysisController::class, 'store'])
        ->name('projects.emotional-analysis.store');

    Route::get('projects/{project}/validations', [NarrativeValidationController::class, 'index'])
        ->name('projects.validations.index');
    Route::post('projects/{project}/validations', [NarrativeValidationController::class, 'store'])
        ->name('projects.validations.store');
    Route::patch('projects/{project}/validations/{validation}', [NarrativeValidationController::class, 'update'])
        ->name('projects.validations.update');

    Route::get('projects/{project}/cost-estimations', [CostEstimationController::class, 'index'])
        ->name('projects.cost-estimations.index');
    Route::post('projects/{project}/cost-estimations', [CostEstimationController::class, 'store'])
        ->name('projects.cost-estimations.store');
});
