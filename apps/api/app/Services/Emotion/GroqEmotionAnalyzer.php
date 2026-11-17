<?php

namespace App\Services\Emotion;

use App\Contracts\EmotionAnalyzer;
use App\Models\Scene;
use App\Services\Ai\AiUnavailableException;
use App\Services\Ai\GroqClient;


class GroqEmotionAnalyzer implements EmotionAnalyzer
{
    public function __construct(
        private readonly GroqClient $groq,
        private readonly SceneContextBuilder $contexts,
        private readonly ScenePrompt $prompt,
        private readonly SceneResultValidator $validator,
        private readonly KeywordEmotionAnalyzer $keywords,
    ) {}

    public function source(): string
    {
        return 'groq';
    }

    public function analyzeScene(Scene $scene): SceneEmotionResult
    {
        $context = $this->contexts->build($scene);

        try {
            $response = $this->groq->chatJson(
                $this->prompt->system($context),
                $this->prompt->user($context),
                $this->prompt->schema(),
                ScenePrompt::SCHEMA_NAME,
                log: [
                    'project_id' => $scene->project_id,
                    'user_id' => auth()->id() ?? $scene->project->user_id,
                    'type' => 'scene_analysis',
                ],
            );
        } catch (AiUnavailableException $exception) {
            return $this->degrade($scene, $exception->generationId);
        }

        $data = $this->validator->validate($response->data, array_column($context['characters'], 'id'));

        if ($data === null) {
            return $this->degrade($scene, $response->generationId);
        }

        return new SceneEmotionResult(
            scene: $data['scene'],
            characters: $data['characters'],
            inconsistencies: $data['inconsistencies'],
            suggestions: $data['suggestions'],
            source: 'groq',
            model: $response->model,
            truncated: $context['scene']['truncated'],
            aiGenerationId: $response->generationId,
        );
    }

    private function degrade(Scene $scene, ?int $generationId): SceneEmotionResult
    {
        $this->groq->markDegraded($generationId);

        return $this->keywords->analyzeScene($scene)->asDegraded($generationId);
    }
}
