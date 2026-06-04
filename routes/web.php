<?php

use App\Http\Controllers\CharacterController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CostEstimationController;
use App\Http\Controllers\DialogueNodeController;
use App\Http\Controllers\EmotionalAnalysisController;
use App\Http\Controllers\LoreEntryController;
use App\Http\Controllers\NarrativeValidationController;
use App\Http\Controllers\ProjectConstraintController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\SceneController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return auth()->check()
        ? redirect()->route('projects.index')
        : Inertia::render('Auth/Login');
});

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
    Route::resource('projects', ProjectController::class);

    Route::post('projects/{project}/constraints', [ProjectConstraintController::class, 'store'])
        ->name('projects.constraints.store');
    Route::put('projects/{project}/constraints', [ProjectConstraintController::class, 'store'])
        ->name('projects.constraints.update');

    Route::resource('projects.lore', LoreEntryController::class)
        ->parameters(['lore' => 'loreEntry'])
        ->except(['show']);

    Route::resource('projects.characters', CharacterController::class)
        ->except(['show']);

    Route::resource('projects.scenes', SceneController::class)
        ->except(['show']);

    Route::resource('projects.dialogues', DialogueNodeController::class)
        ->parameters(['dialogues' => 'dialogue'])
        ->except(['show']);

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
