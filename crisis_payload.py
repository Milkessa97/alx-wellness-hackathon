# crisis_payload.py
# ============================================================
# STATIC CRISIS RESPONSE — NEVER GENERATED, NEVER FETCHED
# This payload is returned directly by the safety gate.
# It must be pre-authored and clinically reviewed.
# Update crisis line numbers if deploying in a specific country.
# ============================================================

def get_crisis_payload() -> dict:
    return {
        "tier": "crisis",
        "score": None,   # Score intentionally withheld from crisis response
        "summary": None, # No LLM summary for crisis tier
        "crisis": {
            "message": (
                "Based on your responses, we want to make sure you have "
                "immediate access to support. Please reach out to one of "
                "the resources below. You do not have to navigate this alone."
            ),
            "resources": [
                {
                    "name": "International Association for Suicide Prevention",
                    "detail": "Directory of crisis centers worldwide",
                    "url": "https://www.iasp.info/resources/Crisis_Centres/"
                },
                {
                    "name": "Crisis Text Line (US/UK/Ireland/Canada)",
                    "detail": "Text HOME to 741741",
                    "url": "https://www.crisistextline.org"
                },
                {
                    "name": "988 Suicide & Crisis Lifeline (US)",
                    "detail": "Call or text 988",
                    "url": "https://988lifeline.org"
                },
                {
                    "name": "Samaritans (UK & Ireland)",
                    "detail": "Call 116 123 — free, 24/7",
                    "url": "https://www.samaritans.org"
                },
                {
                    "name": "Befrienders Worldwide",
                    "detail": "Find a local helpline by country",
                    "url": "https://www.befrienders.org"
                }
            ],
            "disclaimer": (
                "This tool is not a diagnostic instrument and is not a "
                "substitute for professional mental health care. If you are "
                "in immediate danger, please call your local emergency services."
            )
        }
    }
