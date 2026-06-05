from datetime import datetime, timezone, timedelta
from typing import Optional

ASSESSMENT_INTERVAL_DAYS = 0


def check_assessment_gate(
    last_taken_at: Optional[str],  # ISO string from Supabase, or None
    is_authenticated: bool
) -> dict:
    """
    Checks if a user is allowed to take a new assessment.

    Rules:
        - Anonymous users are never gated — always allowed.
        - Authenticated users must wait ASSESSMENT_INTERVAL_DAYS (14) between assessments.
        - All datetime comparisons are timezone-aware (UTC).

    Args:
        last_taken_at: ISO 8601 timestamp string of the user's most recent assessment,
                       or None if they have never taken one.
        is_authenticated: Whether the request comes from a logged-in user.

    Returns:
        dict with keys:
          - allowed: bool — whether the user can take an assessment now
          - days_remaining: int — days until the gate opens (0 if allowed)
          - next_available: ISO string or None — when the next assessment unlocks
          - message: human-readable gate status
    """
    # Anonymous users bypass the gate entirely
    if not is_authenticated:
        return {
            "allowed": True,
            "days_remaining": 0,
            "next_available": None,
            "message": "Assessment available."
        }

    # First-time authenticated user — no prior assessment exists
    if last_taken_at is None or ASSESSMENT_INTERVAL_DAYS == 0:
        return {
            "allowed": True,
            "days_remaining": 0,
            "next_available": None,
            "message": "Assessment available."
        }

    # Parse the last assessment timestamp, ensuring UTC awareness
    dt = datetime.fromisoformat(last_taken_at)
    if dt.tzinfo is None:
        last_dt = dt.replace(tzinfo=timezone.utc)
    else:
        last_dt = dt.astimezone(timezone.utc)
    next_available = last_dt + timedelta(days=ASSESSMENT_INTERVAL_DAYS)
    now = datetime.now(timezone.utc)

    # Gate is open — enough time has passed
    if now >= next_available:
        return {
            "allowed": True,
            "days_remaining": 0,
            "next_available": None,
            "message": "Assessment available."
        }

    # Gate is closed — calculate remaining wait
    days_remaining = (next_available - now).days + 1
    return {
        "allowed": False,
        "days_remaining": days_remaining,
        "next_available": next_available.isoformat(),
        "message": f"Your next check-in opens in {days_remaining} day{'s' if days_remaining != 1 else ''}."
    }
