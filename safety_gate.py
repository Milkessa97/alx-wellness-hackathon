from constants import (
    SAFE_MAX, ELEVATED_MIN, CRISIS_THRESHOLD,
    Q9_ANY_FLAG, TIER_SAFE, TIER_ELEVATED, TIER_CRISIS,
    PHQ9_QUESTION_COUNT
)
from typing import Tuple


def classify_assessment(answers: list[int]) -> Tuple[str, int]:
    """
    Deterministic safety classifier for PHQ-9 responses.

    Contract:
    - Input: list of exactly 9 integers, each in range [0, 3]
    - Output: (tier: str, score: int)
    - Guarantee: This function has no side effects and makes no external calls.
    - Guarantee: TIER_CRISIS is returned if score >= CRISIS_THRESHOLD OR Q9 >= Q9_ANY_FLAG
    - Guarantee: The LLM layer must check tier before calling any generation function.

    This function is intentionally kept separate from all LLM and API logic
    so it can be unit tested independently and audited in isolation.
    """

    # Safety check: ensure correct number of answers before any arithmetic
    if len(answers) != PHQ9_QUESTION_COUNT:
        raise ValueError(
            f"Expected {PHQ9_QUESTION_COUNT} answers, received {len(answers)}"
        )

    # Q9 CHECK FIRST — Question 9 asks about thoughts of self-harm.
    # Any non-zero response (even "Several days") triggers immediate crisis tier.
    # This check happens BEFORE score computation — a score of 1 with Q9=1 is crisis.
    q9_response = answers[8]  # Zero-indexed: Q9 is index 8
    if q9_response >= Q9_ANY_FLAG:
        total_score = sum(answers)
        return TIER_CRISIS, total_score

    # Compute total score only after Q9 has been cleared
    total_score = sum(answers)

    # CRISIS THRESHOLD CHECK
    # Score >= 15 indicates moderately severe to severe depression on PHQ-9 scale.
    # The LLM must never be called for this tier.
    if total_score >= CRISIS_THRESHOLD:
        return TIER_CRISIS, total_score

    # ELEVATED TIER CHECK
    # Scores 10–14 indicate moderate depression. LLM is called but with
    # a restricted prompt and a mandatory disclaimer appended to output.
    if total_score >= ELEVATED_MIN:
        return TIER_ELEVATED, total_score

    # SAFE TIER
    # Scores 0–9 indicate minimal to mild symptoms.
    # Full psychoeducational context injection is permitted.
    return TIER_SAFE, total_score
