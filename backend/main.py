from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from collections import defaultdict
import logging
import time

from models import AssessmentRequest, AssessmentResponse
from safety_gate import classify_assessment
from corpus_loader import load_and_validate_corpus, get_techniques_for_tier
from crisis_payload import get_crisis_payload
from llm_client import generate_summary
from constants import TIER_CRISIS, TIER_ELEVATED, TIER_SAFE

# ── Logging setup ─────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

# ── In-memory rate limiter ─────────────────────────────────
# Simple token bucket per IP — no Redis needed for hackathon
# Stores: {ip: [timestamp, timestamp, ...]}
RATE_LIMIT_WINDOW = 3600      # 1 hour in seconds
RATE_LIMIT_MAX_REQUESTS = 30  # max 30 assessments per IP per hour
_request_log: dict = defaultdict(list)


def is_rate_limited(client_ip: str) -> bool:
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW
    # Remove timestamps outside the window
    _request_log[client_ip] = [
        ts for ts in _request_log[client_ip] if ts > window_start
    ]
    if len(_request_log[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        return True
    _request_log[client_ip].append(now)
    return False


# ── App corpus state ──────────────────────────────────────
# Corpus is loaded once at startup and shared across all requests
corpus_store: dict = {"corpus": None}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: load and validate corpus.
    If corpus is invalid or missing, the app refuses to start.
    This ensures the LLM always has a valid corpus to work from.
    """
    logger.info("Loading wellness techniques corpus...")
    try:
        corpus_store["corpus"] = load_and_validate_corpus()
        logger.info(f"Corpus loaded: {len(corpus_store['corpus'])} techniques validated.")
    except RuntimeError as e:
        logger.critical(f"CORPUS VALIDATION FAILED — APP WILL NOT START: {e}")
        raise
    yield
    logger.info("Shutting down.")


# ── App initialization ─────────────────────────────────────
app = FastAPI(
    title="PHQ-9 Reflective Wellness API",
    description="Psychoeducational self-reflection tool. Not a diagnostic instrument.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS — restrict to localhost during hackathon
# Before production: replace with your actual frontend domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)


# ── Endpoints ─────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Health check endpoint. Verifies corpus is loaded."""
    corpus_loaded = corpus_store["corpus"] is not None
    return {
        "status": "ok" if corpus_loaded else "degraded",
        "corpus_loaded": corpus_loaded,
        "corpus_size": len(corpus_store["corpus"]) if corpus_loaded else 0,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/api/assess")
async def assess(request: Request, body: AssessmentRequest):
    """
    Main assessment endpoint.

    Flow:
    1. Rate limit check
    2. Input validation (handled by Pydantic on the body model)
    3. Safety gate classification (deterministic, no LLM)
    4. If CRISIS → return static payload immediately, no LLM
    5. If ELEVATED or SAFE → call LLM with closed-context prompt
    6. Return structured response with mandatory disclaimer
    """
    # ── Rate limiting ──────────────────────────────────────
    client_ip = request.client.host
    if is_rate_limited(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait before submitting another assessment."
        )

    # ── Safety gate ────────────────────────────────────────
    # classify_assessment is a pure deterministic function.
    # It returns tier and score. No LLM is involved here.
    try:
        tier, score = classify_assessment(body.answers)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Log tier only — no PHI, no score, no answers
    logger.info(f"Assessment processed | tier={tier} | ip_hash={hash(client_ip) % 10000}")

    # ── CRISIS SHORT-CIRCUIT ──────────────────────────────
    # This block must remain first after classification.
    # The LLM is never called. No corpus lookup. No generation.
    # The static payload is returned immediately.
    if tier == TIER_CRISIS:
        logger.warning(f"CRISIS_TIER triggered | ip_hash={hash(client_ip) % 10000}")
        return get_crisis_payload()

    # ── Corpus lookup and LLM generation ─────────────────
    # Only reached if tier is SAFE or ELEVATED
    corpus = corpus_store["corpus"]
    if corpus is None:
        raise HTTPException(status_code=503, detail="Corpus not available. Please retry.")

    techniques = get_techniques_for_tier(corpus, tier)

    try:
        summary = generate_summary(techniques, score, tier)
    except RuntimeError as e:
        logger.error(f"LLM generation failed: {e}")
        raise HTTPException(
            status_code=502,
            detail="Unable to generate reflection at this time. Please try again."
        )

    # ── Build response ────────────────────────────────────
    return {
        "tier": tier,
        "score": score,
        "summary": summary,
        "crisis": None,
        "disclaimer": (
            "This tool is for psychoeducational and self-reflection purposes only. "
            "It is not a clinical assessment, diagnosis, or substitute for professional "
            "mental health care. If you are concerned about your mental health, please "
            "consult a qualified healthcare provider."
        )
    }
