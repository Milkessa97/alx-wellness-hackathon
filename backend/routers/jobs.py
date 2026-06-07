import logging
import uuid
from datetime import date, datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, status
from database import get_supabase
from services.action_plan_generator import generate_action_plan
from services.email_service import send_daily_wellness_email

import os
from dotenv import load_dotenv

load_dotenv()
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["Jobs"])


async def run_daily_email_batch(db) -> dict:
    """
    Send the daily wellness email to every premium (non-soft-deleted) user.

    This is the single source of truth for the batch, shared by the
    cron-triggered endpoint below and the in-process APScheduler job in
    main.py — so the manual and scheduled paths can never drift apart. For
    each user it generates an action plan, creates a 24h mood token, and sends
    the email. Per-user errors are collected so one failure never blocks the
    rest of the batch.

    Args:
        db: A Supabase client (from get_supabase()).

    Returns:
        {"sent": int, "errors": [user_id, ...]}

    Raises:
        RuntimeError: if the premium-user fetch itself fails.
    """
    # ── Fetch premium users ──────────────────────────────────────────
    try:
        res = (
            db.table("users")
            .select("id, email, name")
            .eq("tier", "premium")
            .is_("deleted_at", "null")
            .execute()
        )
        users = res.data or []
    except Exception as e:
        logger.error(f"Failed to fetch premium users: {e}")
        raise RuntimeError("Failed to fetch premium users") from e

    sent_count = 0
    failed_user_ids: list[str] = []
    today = date.today()

    for user in users:
        user_id = user.get("id")
        try:
            # 1. Generate today's action plan
            plan_items = await generate_action_plan(user_id, db)

            # 2. Insert email_mood_tokens row and retrieve the token
            token_str = str(uuid.uuid4())
            expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

            db.table("email_mood_tokens").insert(
                {
                    "user_id": user_id,
                    "mood_date": today.isoformat(),
                    "token": token_str,
                    "used": False,
                    "expires_at": expires_at.isoformat(),
                }
            ).execute()

            # 3. Send the email
            await send_daily_wellness_email(user, plan_items, token_str)

            sent_count += 1
            logger.info(f"Daily email sent for user {user_id}")

        except Exception as e:
            logger.error(f"Daily email failed for user {user_id}: {e}")
            failed_user_ids.append(user_id)

    logger.info(
        f"Daily email batch: {sent_count} sent, {len(failed_user_ids)} failed "
        f"out of {len(users)} premium users"
    )
    return {"sent": sent_count, "errors": failed_user_ids}


@router.post("/daily-email")
async def daily_email_job(
    x_internal_key: str = Header(alias="X-Internal-Key"),
    db=Depends(get_supabase),
):
    """
    Cron-triggered endpoint that validates the internal API key, then runs the
    daily email batch for all premium users (see run_daily_email_batch).

    Returns:
        {"sent": int, "errors": [str]}
    """
    # ── Auth guard ────────────────────────────────────────────────────
    if not INTERNAL_API_KEY or x_internal_key != INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal API key",
        )

    try:
        return await run_daily_email_batch(db)
    except RuntimeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch premium users",
        )
