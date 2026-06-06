"""
One-off: send TODAY's daily wellness / mood-check email to a SINGLE user.

This mirrors the per-user body of the cron batch job (routers/jobs.py:daily_email_job)
but is scoped to one email address instead of every premium user. It:

  1. Looks the user up by email in the `users` table.
  2. Verifies they're on the premium tier (the daily email is a premium feature).
  3. Generates today's action plan.
  4. Creates a 24h email_mood_tokens row (so the emoji links can log mood).
  5. Sends the email via the existing email_service.

Run from the backend/ directory so the `database` / `services` imports resolve, with
the same .env that the API uses (SUPABASE_URL, SUPABASE_SERVICE_KEY, SMTP_*, EMAIL_FROM,
APP_BASE_URL):

    cd backend
    python send_mood_email.py                       # uses the default address below
    python send_mood_email.py someone@example.com   # or pass an address
"""

import asyncio
import sys
import uuid
from datetime import date, datetime, timezone, timedelta

# Windows consoles default to cp1252, which can't encode the status glyphs below.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from database import get_supabase
from services.action_plan_generator import generate_action_plan
from services.email_service import send_daily_wellness_email

DEFAULT_EMAIL = "milkessahabtamukebu@gmail.com"


async def send_for_email(email: str) -> None:
    db = get_supabase()

    # 1. Look up the user by email.
    res = (
        db.table("users")
        .select("id, email, name, tier")
        .eq("email", email)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    if not rows:
        print(f"❌ No user found in `users` with email {email!r}.")
        print("   The daily email needs a real user record (for the action plan and mood token).")
        sys.exit(1)

    user = rows[0]
    user_id = user["id"]

    # 2. Premium gate — the daily wellness email is a premium-only feature.
    if user.get("tier") != "premium":
        print(f"❌ {email} is tier={user.get('tier')!r}, not 'premium'.")
        print("   Set the user's tier to 'premium' (Stripe checkout, or update the row) and retry.")
        sys.exit(1)

    today = date.today()

    # 3. Generate today's action plan.
    print(f"→ Generating action plan for {email} ({user_id})…")
    plan_items = await generate_action_plan(user_id, db)

    # 4. Create the one-click mood token (24h expiry).
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

    # 5. Send the email.
    print(f"→ Sending daily wellness email to {email}…")
    await send_daily_wellness_email(user, plan_items, token_str)

    print(f"✅ Sent to {email}.")
    print(f"   Mood token: {token_str} (expires {expires_at.isoformat()})")
    print(f"   The emoji links point at: {{APP_BASE_URL}}/mood?token={token_str}&mood=<mood>")


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_EMAIL
    asyncio.run(send_for_email(target))
