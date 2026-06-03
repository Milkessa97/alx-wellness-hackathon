import os
from groq import Groq
from dotenv import load_dotenv
from constants import LLM_MODEL, LLM_TEMPERATURE, LLM_MAX_TOKENS, TIER_CRISIS, TIER_ELEVATED
from corpus_loader import format_corpus_for_prompt
from typing import List, Dict
# Load .env relative to the directory containing this file
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=env_path)

ELEVATED_DISCLAIMER = (
    "\n\n---\n"
    "⚠️ **Important:** This reflection is a psychoeducational tool only. "
    "Your responses suggest it may be helpful to speak with a qualified mental health "
    "professional. This tool is not a diagnosis and not a substitute for professional support."
)

SAFE_DISCLAIMER = (
    "\n\n---\n"
    "*This reflection is generated from a curated psychoeducational corpus. "
    "It is not a clinical assessment or medical advice.*"
)


def build_system_prompt(techniques: List[Dict], score: int, tier: str) -> str:
    """
    Constructs the system prompt using the closed-context synthesis pattern.
    Order: (1) hard constraint, (2) corpus, (3) user context.
    This order is intentional: the constraint must be read before the corpus
    so the model encounters the restriction before any generative material.
    """
    corpus_text = format_corpus_for_prompt(techniques)

    return f"""You are a reflective wellness writing assistant.

STRICT CONSTRAINT: You must only reference and synthesize from the APPROVED TECHNIQUES listed below. You may NOT:
- Introduce clinical terminology or diagnostic language
- Make treatment recommendations of any kind
- Reference medications, therapists, or clinical interventions
- Generate content not grounded in the source material below
- Use the word "diagnosis", "disorder", "symptom", "treatment", or "condition"

If you cannot address the user's context within this approved material, you must say so explicitly rather than introducing outside content.

APPROVED TECHNIQUES:
{corpus_text}

USER CONTEXT:
PHQ-9 score: {score}
Severity tier: {tier}

TASK: Write a warm, empathetic 3–4 paragraph reflection that:
1. Acknowledges the person's experience without labeling or diagnosing it
2. Highlights 2–3 techniques from the approved list most relevant to their score tier
3. Frames these techniques as options to explore, not prescriptions
4. Ends with one sentence of genuine encouragement

Do not number paragraphs. Do not use bullet points. Write in flowing, human prose."""


def generate_summary(techniques: List[Dict], score: int, tier: str) -> str:
    """
    Calls Groq API to generate a closed-context psychoeducational reflection.

    Raises:
        ValueError: If called with crisis tier (must be caught upstream)
        RuntimeError: If Groq API call fails
    """
    # HARD GUARD — this function must never be called for crisis tier
    # This is a defense-in-depth check; the primary block is in main.py
    if tier == TIER_CRISIS:
        raise ValueError(
            "generate_summary must never be called with tier='crisis'. "
            "This is a safety violation. Check safety gate logic in main.py."
        )

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set in environment variables.")

    client = Groq(api_key=api_key)
    system_prompt = build_system_prompt(techniques, score, tier)

    try:
        completion = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": (
                        "Please write my personalized wellness reflection based on "
                        "my PHQ-9 responses and the approved techniques above."
                    )
                }
            ],
            temperature=LLM_TEMPERATURE,
            max_tokens=LLM_MAX_TOKENS,
        )
    except Exception as e:
        raise RuntimeError(f"Groq API call failed: {e}")

    raw_summary = completion.choices[0].message.content.strip()

    # Append tier-appropriate disclaimer to every LLM response
    # Elevated tier gets a stronger disclaimer than safe tier
    if tier == TIER_ELEVATED:
        return raw_summary + ELEVATED_DISCLAIMER
    else:
        return raw_summary + SAFE_DISCLAIMER
