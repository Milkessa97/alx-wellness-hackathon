from fastapi import APIRouter, Depends
from auth import get_current_user
from database import get_user_assessments
from trend import classify_trend
from encouragement import get_encouragement

router = APIRouter()

@router.get("/api/trend")
async def get_user_trend(current_user: dict = Depends(get_current_user)):
    """
    Analyzes historical assessments to return the user's trend metrics and encouragement.
    """
    assessments = get_user_assessments(current_user["id"])
    
    # Extract score values. assessments is sorted newest first, so reverse to get oldest first.
    scores = [record.get("score") for record in assessments][::-1]
    
    trend_info = classify_trend(scores)
    trend = trend_info.get("trend")
    encouragement = get_encouragement(trend)
    
    return {
        "user_id": current_user["id"],
        "trend": trend_info.get("trend"),
        "delta": trend_info.get("delta"),
        "message": trend_info.get("message"),
        "encouragement": encouragement,
        "latest_score": scores[-1] if scores else None,
        "previous_score": scores[-2] if len(scores) >= 2 else None
    }
