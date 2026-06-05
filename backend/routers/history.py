import hashlib
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends

from auth import get_current_user
from database import (
    get_user_assessments,
    get_user_milestones_count,
    delete_user_assessments,
    delete_user_milestones
)
from models import HistoryResponse, DeleteHistoryResponse, AssessmentHistoryItem, TrendBlock
from trend import classify_trend
from encouragement import get_encouragement

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/api/history", response_model=HistoryResponse)
async def get_history(current_user: dict = Depends(get_current_user)):
    """
    Retrieves the assessment history for the authenticated user, ordered by taken_at descending.
    """
    user_id = current_user["id"]
    
    # Fetch all assessments for the user
    assessments_data = get_user_assessments(user_id) or []
    
    # Sort by taken_at descending (newest first). Fallback to created_at if taken_at is missing.
    assessments_data.sort(key=lambda x: x.get("taken_at") or x.get("created_at") or "", reverse=True)
    
    # Map to AssessmentHistoryItem list (never return raw answers or LLM summaries)
    assessments = [
        AssessmentHistoryItem(
            id=record.get("id"),
            score=record.get("score"),
            tier=record.get("tier"),
            taken_at=record.get("taken_at"),
            next_assessment_at=record.get("next_assessment_at")
        )
        for record in assessments_data
    ]
    
    # For trend calculation, we need scores in chronological order (oldest first)
    scores = [record.score for record in assessments][::-1]
    
    trend_info = classify_trend(scores)
    trend_label = trend_info.get("trend")
    
    trend_block = TrendBlock(
        trend=trend_label,
        delta=trend_info.get("delta"),
        message=trend_info.get("message")
    )
    
    encouragement = get_encouragement(trend_label)
    milestones_earned = get_user_milestones_count(user_id)
    
    return HistoryResponse(
        assessments=assessments,
        total=len(assessments),
        trend=trend_block,
        encouragement=encouragement,
        milestones_earned=milestones_earned
    )


@router.delete("/api/history", response_model=DeleteHistoryResponse)
async def delete_history(current_user: dict = Depends(get_current_user)):
    """
    Deletes all assessments and milestones for the authenticated user (privacy control).
    """
    user_id = current_user["id"]
    
    # Wipe user data from assessments and milestones tables
    deleted_count = delete_user_assessments(user_id)
    _ = delete_user_milestones(user_id)
    
    # Log deletion event server-side (anonymized: user_id hash + timestamp)
    user_hash = hashlib.sha256(user_id.encode("utf-8")).hexdigest()
    timestamp = datetime.now(timezone.utc).isoformat()
    
    logger.info(f"User assessment history deleted | user_hash={user_hash} | timestamp={timestamp} | count={deleted_count}")
    
    return DeleteHistoryResponse(
        deleted=True,
        count=deleted_count
    )
