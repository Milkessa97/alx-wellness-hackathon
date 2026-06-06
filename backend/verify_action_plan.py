"""
Dry-run: verify that generate_action_plan ACTUALLY produces an LLM-generated plan
for a user, rather than silently falling back to the default plan.

Does NOT send an email or create a mood token. It does upsert into action_plans
(same as the real path), which is idempotent per (user_id, plan_date).

    cd backend
    python verify_action_plan.py [email]
"""

import asyncio
import json
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from database import get_supabase
from services.action_plan_generator import generate_action_plan, default_action_plan

DEFAULT_EMAIL = "milkessahabtamukebu@gmail.com"

# The fixed texts the fallback emits — used to detect a non-generated plan.
DEFAULT_TEXTS = {item["text"] for item in default_action_plan()}


async def main(email: str) -> None:
    db = get_supabase()

    user = (
        db.table("users").select("id, email, tier").eq("email", email).limit(1).execute()
    ).data
    if not user:
        print(f"❌ No user with email {email!r}.")
        sys.exit(1)
    user_id = user[0]["id"]

    # How many assessments does this user have? Drives which path runs.
    assess = (
        db.table("assessments")
        .select("score, tier, taken_at")
        .eq("user_id", user_id)
        .order("taken_at", desc=True)
        .limit(3)
        .execute()
    ).data or []
    print(f"User {email} (tier={user[0].get('tier')}) has {len(assess)} recent assessment(s).")
    if not assess:
        print("⚠️  No assessments → generate_action_plan returns the DEFAULT plan WITHOUT calling the LLM.")
    else:
        for a in assess:
            print(f"   - {a.get('taken_at')}: score={a.get('score')} tier={a.get('tier')}")

    print("\n→ Calling generate_action_plan…\n")
    plan = await generate_action_plan(user_id, db)

    print(json.dumps(plan, indent=2))

    plan_texts = {item.get("text") for item in plan}
    is_default = plan_texts == DEFAULT_TEXTS
    print()
    if is_default:
        print("🟡 RESULT: this is the DEFAULT fallback plan (texts match default_action_plan()).")
        if assess:
            print("   You have assessments, so this means the Groq call failed or returned bad JSON.")
        else:
            print("   Expected — no assessments to personalize from. Take an assessment, then retry.")
    else:
        print(f"🟢 RESULT: LLM-GENERATED plan ({len(plan)} items, not the default texts).")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_EMAIL))
