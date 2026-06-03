# PHQ-9 Backend

FastAPI application for PHQ-9 screening assessment and safe wellness recommendation generation.

## Directory Structure
- `main.py`: Entry point for the FastAPI application.
- `safety_gate.py`: Deterministic safety logic (rules/regex/parsing checks).
- `llm_client.py`: Groq API wrapper for query handling.
- `corpus_loader.py`: Loader and validator for the wellness techniques JSON.
- `models.py`: Pydantic request/response data models.
- `constants.py`: Hardcoded safety constants and threshold definitions.
- `crisis_payload.py`: Static crisis response configurations.
- `wellness_techniques.json`: Local corpus of evidence-based wellness activities.
