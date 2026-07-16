# PrepPilot — Python Analysis API

Self-contained FastAPI microservice that handles resume parsing and multi-agent
candidate evaluation. Runs on **port 8001** and is called by the Node.js backend.

## Setup

```bash
cd python-api

# Create a virtual environment (recommended)
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the server
python -m uvicorn api_server:app --port 8001 --reload
```

## Environment Variables

All config lives in `python-api/.env` (already populated):

| Variable | Default | Description |
|---|---|---|
| `GOOGLE_API_KEY` | — | **Required.** Google Gemini API key |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` | Gemini model to use |
| `GEMINI_TEMPERATURE` | `0` | LLM temperature (0 = deterministic) |
| `WEIGHT_SKILL` | `0.40` | Skill match weight (must sum to 1.0) |
| `WEIGHT_EXPERIENCE` | `0.30` | Experience weight |
| `WEIGHT_CULTURE` | `0.20` | Culture fit weight |
| `WEIGHT_EDUCATION` | `0.10` | Education weight |

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/parse` | Full multi-agent analysis pipeline |

## Agent Pipeline

```
Wave 1 (parallel): ResumeParser + JDParser
Wave 2 (parallel): SkillMatcher + ExperienceEvaluator + EducationEvaluator + CultureFit + ResumeSummarizer
Wave 3 (parallel): DecisionAgent + InterviewQuestionAgent
```
