from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional
import logging

from corpus_loader import load_and_validate_corpus
from database import test_connection, get_user_assessments
from auth import get_optional_user
from gating import check_assessment_gate
from routers import assess, history, trend, referral, auth_router, stripe_router

# ── Logging setup ─────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)


# ── App corpus state ──────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: load and validate corpus, then verify the Supabase connection.
    If corpus is invalid or missing, the app refuses to start.
    This ensures the LLM always has a valid corpus to work from.
    A failed Supabase connection is logged but NOT fatal — the app still
    serves anonymous users when the database is unavailable.
    """
    logger.info("Loading wellness techniques corpus...")
    try:
        app.state.corpus = load_and_validate_corpus()
        logger.info(f"Corpus loaded: {len(app.state.corpus)} techniques validated.")
    except RuntimeError as e:
        logger.critical(f"CORPUS VALIDATION FAILED — APP WILL NOT START: {e}")
        raise

    # Verify Supabase connectivity — non-fatal for anonymous-only operation
    connection_ok = test_connection()
    if not connection_ok:
        logger.warning("Supabase connection failed — authenticated features unavailable")
    # Do NOT raise — app should still work for anonymous users if DB is down

    yield
    logger.info("Shutting down.")


# ── App initialization ─────────────────────────────────────
app = FastAPI(
    title="PHQ-9 Reflective Wellness API",
    description="Psychoeducational self-reflection tool. Not a diagnostic instrument.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS — restrict to known frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://maedot-welness.vercel.app"
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        # Add your Vercel URL here before deploying:
        # "https://your-app.vercel.app",
    ],
    allow_credentials=False,
    allow_methods=["POST", "GET", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

# Include Routers (each router already namespaces its paths under /api)
app.include_router(auth_router.router)
app.include_router(assess.router)
app.include_router(history.router)
app.include_router(trend.router)
app.include_router(referral.router)
app.include_router(stripe_router.router, prefix="/api")


# ── Endpoints ─────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Health check endpoint. Verifies corpus is loaded."""
    corpus = getattr(app.state, "corpus", None)
    corpus_loaded = corpus is not None
    return {
        "status": "ok" if corpus_loaded else "degraded",
        "corpus_loaded": corpus_loaded,
        "corpus_size": len(corpus) if corpus_loaded else 0,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/api/gate")
async def assessment_gate(current_user: Optional[dict] = Depends(get_optional_user)):
    """
    Lightweight gate check for the frontend to call on page load,
    before showing (or submitting) a full assessment.

    - Anonymous users are never gated — returns {"allowed": True} immediately.
    - Authenticated users are gated by ASSESSMENT_INTERVAL_DAYS since their
      most recent assessment.
    """
    if current_user is None:
        return {"allowed": True}

    user_id = current_user["id"]
    history = get_user_assessments(user_id)
    last_taken_at = history[0].get("taken_at") if history else None

    return check_assessment_gate(last_taken_at, is_authenticated=True)
