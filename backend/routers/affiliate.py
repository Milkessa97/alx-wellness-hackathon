import json
import os
import logging
from fastapi import APIRouter, HTTPException, status

logger = logging.getLogger(__name__)

router = APIRouter()

# Get absolute path to data/affiliates.json
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE_PATH = os.path.join(BASE_DIR, "data", "affiliates.json")

@router.get("/api/affiliates")
async def get_affiliates(tier: str = None):
    """
    Returns a list of affiliates, optionally filtered by tier (e.g. 'safe', 'elevated', 'crisis').
    """
    if not os.path.exists(DATA_FILE_PATH):
        logger.error(f"Affiliates file not found at {DATA_FILE_PATH}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Affiliates dataset is currently unavailable."
        )

    try:
        with open(DATA_FILE_PATH, "r", encoding="utf-8") as f:
            affiliates = json.load(f)
    except Exception as e:
        logger.error(f"Failed to read affiliates file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error reading affiliates dataset."
        )

    if tier:
        tier_lower = tier.strip().lower()
        affiliates = [
            aff for aff in affiliates
            if any(t.lower() == tier_lower for t in aff.get("tier_coverage", []))
        ]

    return affiliates
