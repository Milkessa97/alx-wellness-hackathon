# constants.py
# ============================================================
# SAFETY CONSTANTS — DO NOT MOVE TO ENV OR CONFIG FILES
# These are hardcoded by design. The crisis threshold must not
# be a runtime-configurable value. If asked during a demo:
# "What prevents someone from changing the threshold?"
# Answer: "It is a constant in source code, not a setting."
# ============================================================

# PHQ-9 scoring thresholds
SAFE_MAX = 9                  # Scores 0–9: safe tier
ELEVATED_MIN = 10             # Scores 10–14: elevated tier
CRISIS_THRESHOLD = 15         # Scores ≥15: hard block, no LLM

# Question 9 flag — any non-zero answer triggers hard block
Q9_ANY_FLAG = 1

# Tier labels
TIER_SAFE = "safe"
TIER_ELEVATED = "elevated"
TIER_CRISIS = "crisis"

# LLM configuration
LLM_MODEL = "llama-3.1-8b-instant"       # Groq model
LLM_TEMPERATURE = 0.35             # Low temp = fewer hallucinations
LLM_MAX_TOKENS = 200               # Enough for summary, not a wall of text

# PHQ-9 question count
PHQ9_QUESTION_COUNT = 9
# PHQ-9 answer bounds
PHQ9_ANSWER_MIN = 0
PHQ9_ANSWER_MAX = 3
