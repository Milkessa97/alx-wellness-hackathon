import json
import os
from typing import List, Dict

CORPUS_PATH = os.path.join(os.path.dirname(__file__), "wellness_techniques.json")

REQUIRED_FIELDS = {"id", "title", "description", "evidence_category", "tier", "source"}
VALID_TIERS = {"safe", "elevated"}


def load_and_validate_corpus() -> List[Dict]:
    """
    Load wellness_techniques.json and validate structure.
    Raises RuntimeError if any entry is malformed or corpus is empty.
    Called once at application startup — not per request.
    """
    if not os.path.exists(CORPUS_PATH):
        raise RuntimeError(
            f"CORPUS NOT FOUND at {CORPUS_PATH}. "
            "wellness_techniques.json must exist before the app starts."
        )

    with open(CORPUS_PATH, "r", encoding="utf-8") as f:
        try:
            corpus = json.load(f)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"wellness_techniques.json is not valid JSON: {e}")

    if not isinstance(corpus, list) or len(corpus) == 0:
        raise RuntimeError("wellness_techniques.json must be a non-empty JSON array.")

    for i, entry in enumerate(corpus):
        missing = REQUIRED_FIELDS - set(entry.keys())
        if missing:
            raise RuntimeError(
                f"Entry {i} (id={entry.get('id', 'UNKNOWN')}) is missing fields: {missing}"
            )
        if not isinstance(entry["tier"], list):
            raise RuntimeError(
                f"Entry {i} 'tier' must be a list, got {type(entry['tier'])}"
            )
        invalid_tiers = set(entry["tier"]) - VALID_TIERS
        if invalid_tiers:
            raise RuntimeError(
                f"Entry {i} contains invalid tier values: {invalid_tiers}. "
                f"Valid values are: {VALID_TIERS}"
            )

    return corpus


def get_techniques_for_tier(corpus: List[Dict], tier: str) -> List[Dict]:
    """
    Filter corpus to only techniques applicable for the given tier.
    Crisis tier is never passed here — that is enforced in main.py.
    """
    if tier == "crisis":
        raise ValueError(
            "get_techniques_for_tier must never be called with tier='crisis'. "
            "Crisis tier must be short-circuited before this function."
        )
    return [t for t in corpus if tier in t["tier"]]


def format_corpus_for_prompt(techniques: List[Dict]) -> str:
    """
    Formats filtered techniques into the string injected into the system prompt.
    Returns only title, description, evidence_category, and source — 
    NOT the tier metadata (internal implementation detail).
    """
    lines = []
    for t in techniques:
        lines.append(
            f"[{t['id']}] {t['title']}\n"
            f"  {t['description']}\n"
            f"  Evidence type: {t['evidence_category']}\n"
            f"  Source: {t['source']}"
        )
    return "\n\n".join(lines)
