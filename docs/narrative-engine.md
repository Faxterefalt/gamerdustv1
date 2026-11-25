# Motor narrativo en Python (diseño previsto, sin implementar)

Hasta la reorganización del repositorio existía `apps/narrative-engine/`: un esqueleto de servicio Python (FastAPI previsto) en el que **todos los archivos estaban vacíos**. Se eliminó para no arrastrar código vacío; este documento conserva la idea. El esqueleto original puede consultarse en el historial de git (commit `86c0380`).

## Situación actual

El análisis emocional lo hace la app Laravel detrás del contrato `App\Contracts\EmotionAnalyzer` (`analyzeScene(Scene)` → `SceneEmotionResult`, `source()`), con dos implementaciones: `GroqEmotionAnalyzer` (Groq) y `KeywordEmotionAnalyzer` (palabras clave, sin red). `AppServiceProvider` elige una según `config('gamerdust.ai.driver')`. Un motor externo sería una tercera implementación del mismo contrato (por ejemplo, un cliente HTTP hacia este servicio), sin tocar controladores ni interfaz. El modelo completo está en [modelo-asistencia-emocional.md](modelo-asistencia-emocional.md).

## Proyecto previsto

`pyproject.toml`:

```toml
[project]
name = "gamerdust-narrative-engine"
version = "0.1.0"
description = "Motor de análisis narrativo de Gamerdust (texto, VAD, coherencia e IA)"
requires-python = ">=3.11"
dependencies = []
```

## Módulos previstos

```
app/
├── main.py                       arranque de la aplicación FastAPI
├── config.py                     configuración (variables de entorno)
├── routers/
│   ├── health.py                 comprobación de estado
│   └── analysis.py               endpoints de análisis
├── schemas/
│   ├── analysis_request.py       petición de análisis
│   └── analysis_response.py      respuesta de análisis
├── services/
│   └── analysis_service.py       orquesta el pipeline
├── preprocessing/
│   ├── text_cleaner.py           limpieza del texto
│   └── segmenter.py              segmentación (escenas, bloques, réplicas)
├── emotions/
│   ├── emotion_classifier.py     clasificación de emociones
│   └── vad_analyzer.py           valencia, activación y dominancia (VAD)
├── consistency/
│   ├── rule_engine.py            motor de reglas
│   ├── character_checker.py      coherencia de personajes
│   ├── lore_checker.py           coherencia con el lore
│   └── ludonarrative_checker.py  coherencia ludonarrativa
├── llm/
│   ├── client.py                 cliente del modelo de lenguaje
│   └── prompts/
│       ├── emotion_analysis.txt
│       └── narrative_consistency.txt
└── postprocessing/
    ├── response_validator.py     validación de la respuesta del modelo
    └── evidence_validator.py     validación de las evidencias citadas
tests/fixtures/                   datos de prueba
```
