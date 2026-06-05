import random
from typing import Optional

ENCOURAGEMENT_MESSAGES = {
    "improving": [
        "Your scores are moving in a positive direction. Small steps add up.",
        "Something you're doing is working. Keep going.",
        "Progress shows in the numbers. Well done for showing up.",
    ],
    "stable": [
        "Consistency is underrated. Showing up matters.",
        "Stability is its own kind of progress.",
        "Steady is good. You're building a foundation.",
    ],
    "declining": [
        "Harder weeks happen. You showed up anyway — that counts.",
        "This data is information, not a verdict. You're still here.",
        "Difficult periods pass. Reaching out is always the right move.",
    ],
    "insufficient_data": [
        "Thank you for taking this first step.",
        "Starting is often the hardest part. You did it.",
    ]
}

MILESTONES = [
    {
        "id": "first_checkin",
        "message": "First check-in completed. Welcome.",
        "condition": lambda history: len(history) == 1
    },
    {
        "id": "third_checkin",
        "message": "Three check-ins completed. You're building a habit.",
        "condition": lambda history: len(history) == 3
    },
    {
        "id": "tenth_checkin",
        "message": "Ten check-ins. That's real commitment to understanding yourself.",
        "condition": lambda history: len(history) == 10
    },
    {
        "id": "first_improvement",
        "message": "Your score improved since last time. Notice that.",
        "condition": lambda history: (
            len(history) >= 2 and
            history[-1]["score"] < history[-2]["score"]
        )
    },
]


def get_encouragement(trend: str) -> str:
    """
    Returns a random encouragement message for the given trend.
    Never generated for the crisis tier.
    
    Args:
        trend: The classified trend name ('improving', 'stable', 'declining', 'insufficient_data').
               If 'crisis', an empty string is returned.
               
    Returns:
        A warm, supportive encouragement string.
    """
    if trend == "crisis":
        return ""
    messages = ENCOURAGEMENT_MESSAGES.get(trend, ENCOURAGEMENT_MESSAGES["insufficient_data"])
    return random.choice(messages)


def detect_new_milestones(
    history: list[dict],
    already_awarded: list[str]
) -> list[dict]:
    """
    Checks which milestones are newly earned based on assessment history.
    Idempotent and safe to run multiple times.
    
    Args:
        history: Full assessment history for user (oldest first).
        already_awarded: List of milestone IDs already given to this user.
    
    Returns:
        List of newly earned milestone dicts (may be empty).
    """
    newly_earned = []
    for milestone in MILESTONES:
        if milestone["id"] in already_awarded:
            continue
        try:
            if milestone["condition"](history):
                newly_earned.append({
                    "id": milestone["id"],
                    "message": milestone["message"]
                })
        except Exception:
            # Shield against key or index errors in lambda conditions
            continue
    return newly_earned
