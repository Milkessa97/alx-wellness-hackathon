from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Literal
from datetime import datetime, timezone, date
import calendar
from database import get_supabase
from dependencies.auth import require_premium

router = APIRouter(prefix="/mood", tags=["Mood"])

# POST Request Schema
class MoodLogRequest(BaseModel):
    token: str
    mood: Literal['happy', 'sad', 'angry', 'anxious', 'calm', 'tired']

@router.post("/log")
def log_mood(body: MoodLogRequest, db=Depends(get_supabase)):
    # 1. Query email_mood_tokens where token=token
    res = db.table("email_mood_tokens").select("*").eq("token", body.token).execute()
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or used token"
        )
    
    token_data = res.data[0]
    
    # 2. Check if already used
    if token_data.get("used") is True:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or used token"
        )
    
    # 3. Check expiration
    expires_at_str = token_data.get("expires_at")
    if not expires_at_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token expired"
        )
    
    # Parse isoformat string to timezone-aware UTC datetime
    try:
        # Replace Z with +00:00 to support Python's ISO parsing smoothly if present
        cleaned_expires_at = expires_at_str.replace("Z", "+00:00")
        expires_at = datetime.fromisoformat(cleaned_expires_at)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token expired"
        )
        
    now = datetime.now(timezone.utc)
    if expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token expired"
        )
        
    user_id = token_data.get("user_id")
    mood_date = token_data.get("mood_date")
    
    # 4. Upsert mood_logs {user_id, mood, logged_at: mood_date}
    # Supabase upsert performs an insert or update on unique constraint conflicts.
    mood_log = {
        "user_id": user_id,
        "mood": body.mood,
        "logged_at": mood_date
    }
    
    try:
        db.table("mood_logs").upsert(mood_log).execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upsert mood log: {str(e)}"
        )
        
    # 5. Update email_mood_tokens set used=True where token=token
    try:
        db.table("email_mood_tokens").update({"used": True}).eq("token", body.token).execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to invalidate token: {str(e)}"
        )
        
    # 6. Return status
    return {"status": "ok"}

@router.get("/calendar")
def get_mood_calendar(year: int, month: int, user_id: str = Depends(require_premium), db=Depends(get_supabase)):
    # 1. Build start and end dates
    try:
        start_date = date(year, month, 1)
        _, last_day = calendar.monthrange(year, month)
        end_date = date(year, month, last_day)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid year or month format"
        )
        
    # 2. Query mood_logs where user_id=user_id AND logged_at BETWEEN start AND end
    try:
        res = (
            db.table("mood_logs")
            .select("logged_at, mood")
            .eq("user_id", user_id)
            .gte("logged_at", start_date.isoformat())
            .lte("logged_at", end_date.isoformat())
            .execute()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query mood logs: {str(e)}"
        )
        
    # 3. Return list of {logged_at: str, mood: str}
    return [{"logged_at": log.get("logged_at"), "mood": log.get("mood")} for log in res.data]
