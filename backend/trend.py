from typing import Optional

def classify_trend(scores: list[int]) -> dict:
    """
    Classifies score trend from assessment history.
    
    Args:
        scores: List of PHQ-9 scores, oldest first.
                Minimum 3 required for classification.
    
    Returns:
        dict with keys:
          - trend: 'improving' | 'declining' | 'stable' | 'insufficient_data'
          - delta: float (negative = improving, positive = declining)
          - message: human-readable description of the trend
    """
    # Verify that we have the minimum 3 assessments to establish a trend
    if len(scores) < 3:
        return {
            "trend": "insufficient_data",
            "delta": None,
            "message": "Complete more check-ins to see your trend."
        }

    # Extract the 3 most recent check-in scores
    recent = scores[-3:]
    
    # Extract older scores. If we have more than 3 scores, we compare the last 3
    # against everything that came before. If we have exactly 3, we compare the last 3
    # against the very first score (index 0) to establish a baseline.
    older  = scores[:-3] if len(scores) > 3 else scores[:1]

    # Calculate average score of the recent check-ins
    avg_recent = sum(recent) / len(recent)
    
    # Calculate average score of the older check-ins
    avg_older  = sum(older)  / len(older)
    
    # Determine the change/delta. A negative value indicates that scores have decreased (improvement).
    # A positive value indicates that scores have increased (declining).
    delta = avg_recent - avg_older

    # The clinically meaningful threshold set for this check
    THRESHOLD = 3.0

    if delta <= -THRESHOLD:
        return {
            "trend": "improving",
            "delta": round(delta, 2),
            "message": "Your scores have been moving in a positive direction."
        }
    elif delta >= THRESHOLD:
        return {
            "trend": "declining",
            "delta": round(delta, 2),
            "message": "Your recent scores have been higher than before."
        }
    else:
        return {
            "trend": "stable",
            "delta": round(delta, 2),
            "message": "Your scores have been relatively consistent."
        }


def get_trend_prompt_context(trend: str) -> str:
    """
    Returns the text injected into the LLM system prompt
    when a signed-in user has sufficient history.
    
    Args:
        trend: The classified trend name.
        
    Returns:
        The prompt context snippet to be appended to the LLM's system instructions.
    """
    TREND_CONTEXT = {
        "improving": (
            "TREND CONTEXT: This person's PHQ-9 scores have been improving "
            "over recent check-ins. Acknowledge their progress warmly and "
            "specifically. Do not be effusive — be grounded and specific."
        ),
        "declining": (
            "TREND CONTEXT: This person's PHQ-9 scores have been gradually "
            "increasing recently. Be especially warm and validating. "
            "Gently encourage professional support without alarming language. "
            "Do not use the word 'declining' or 'worsening'."
        ),
        "stable": (
            "TREND CONTEXT: This person's scores have been consistent. "
            "Acknowledge their steadiness and encourage continued small steps."
        ),
        "insufficient_data": ""
    }
    return TREND_CONTEXT.get(trend, "")
