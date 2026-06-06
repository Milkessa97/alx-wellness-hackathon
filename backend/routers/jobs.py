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


@router.post("/daily-email")
async def daily_email_job(
    x_internal_key: str = Header(alias="X-Internal-Key"),
    db=Depends(get_supabase),
):
    """
    Cron-triggered endpoint that:
      1. Validates the internal API key.
      2. Fetches all premium users (not soft-deleted).
      3. For each user — generates an action plan, creates a mood token,
         and sends the daily wellness email.
      4. Collects per-user errors so one failure never blocks the batch.

    Returns:
        {"sent": int, "errors": [str]}
    """
    # ── Auth guard ────────────────────────────────────────────────────
    if not INTERNAL_API_KEY or x_internal_key != INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal API key",
        )

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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch premium users",
        )

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

    return {"sent": sent_count, "errors": failed_user_ids}
