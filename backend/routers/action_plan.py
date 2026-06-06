from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import date
from database import get_supabase
from dependencies.auth import require_premium

router = APIRouter(prefix="/action-plan", tags=["Action Plan"])

class DoneRequest(BaseModel):
    done: bool

@router.get("/today")
def get_today_action_plan(user_id: str = Depends(require_premium), db=Depends(get_supabase)):
    today_date = date.today().isoformat()
    try:
        res = (
            db.table("action_plans")
            .select("plan_date, items")
            .eq("user_id", user_id)
            .eq("plan_date", today_date)
            .execute()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query failed: {str(e)}"
        )

    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No plan generated yet for today"
        )
        
    plan = res.data[0]
    return {
        "plan_date": plan.get("plan_date"),
        "items": plan.get("items")
    }

@router.patch("/item/{item_id}/done")
def update_action_plan_item_status(
    item_id: str,
    body: DoneRequest,
    user_id: str = Depends(require_premium),
    db=Depends(get_supabase)
):
    today_date = date.today().isoformat()
    # 1. Fetch today's action_plans row
    try:
        res = (
            db.table("action_plans")
            .select("*")
            .eq("user_id", user_id)
            .eq("plan_date", today_date)
            .execute()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query failed: {str(e)}"
        )

    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No plan generated yet for today"
        )

    plan_row = res.data[0]
    items = plan_row.get("items")
    if not isinstance(items, list):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Action plan items format is invalid"
        )

    # 2. Loop items JSONB list, find item['id'] == item_id, set item['done'] = body.done
    item_found = False
    for item in items:
        if str(item.get("id")) == item_id:
            item["done"] = body.done
            item_found = True
            break

    if not item_found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found in today's action plan"
        )

    # 3. Write back updated items list to Supabase
    try:
        db.table("action_plans").update({"items": items}).eq("user_id", user_id).eq("plan_date", today_date).execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update action plan items: {str(e)}"
        )

    # 4. Return ok status
    return {"status": "ok"}
