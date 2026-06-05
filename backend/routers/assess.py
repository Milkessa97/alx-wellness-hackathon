import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status

from models import AssessmentRequest, AssessmentResponse, TrendBlock, Milestone, GateBlock
from safety_gate import classify_assessment
from corpus_loader import get_techniques_for_tier
from crisis_payload import get_crisis_payload
from constants import TIER_CRISIS, TIER_ELEVATED, TIER_SAFE
from auth import get_optional_user
from database import get_supabase, save_assessment, save_milestones, get_user_assessments
from gating import check_assessment_gate, ASSESSMENT_INTERVAL_DAYS
from trend import classify_trend, get_trend_prompt_context
from encouragement import detect_new_milestones, MILESTONES

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/api/assess", response_model=AssessmentResponse)
async def assess(
    request: Request,
    body: AssessmentRequest,
    current_user: dict = Depends(get_optional_user)
):
    # Step 1: Get optional user (None if anonymous)
    user_id = current_user["id"] if current_user else None
    is_authenticated = user_id is not None
    history = []
    last_taken_at = None

    # Step 2: If authenticated — check assessment gate
    if is_authenticated:
        # We fetch all user history to use for both gating and milestone logic
        history = get_user_assessments(user_id)
        last_taken_at = history[0].get("taken_at") if history else None
        
        gate = check_assessment_gate(last_taken_at, is_authenticated)
        if not gate["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "days_remaining": gate["days_remaining"],
                    "next_available": gate["next_available"]
                }
            )

    # Step 3: Validate answers (Pydantic — already handled by FastAPI)
    
    # Step 4: Run safety gate (classify_assessment) — UNCHANGED
    try:
        tier, score = classify_assessment(body.answers)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    logger.info(f"Assessment classified | user_id={user_id} | score={score} | tier={tier}")

    gate_response = None
    if is_authenticated:
        now = datetime.now(timezone.utc)
        gate_info = check_assessment_gate(now.isoformat(), is_authenticated)
        gate_response = GateBlock(
            next_available=gate_info["next_available"],
            days_remaining=gate_info["days_remaining"]
        )

    # Step 5: If CRISIS — return static crisis payload immediately
    if tier == TIER_CRISIS:
        logger.warning(f"CRISIS_TIER triggered | user_id={user_id}")
        # If authenticated: do NOT save to database
        # Return crisis payload + gate info
        crisis_payload = get_crisis_payload()
        return AssessmentResponse(
            tier=tier,
            score=None,
            summary=None,
            crisis=crisis_payload["crisis"],
            disclaimer=crisis_payload["crisis"]["disclaimer"],
            trend=None,
            milestones=None,
            gate=gate_response
        )

    # Step 6: If authenticated — fetch last 6 assessments from Supabase
    recent_history = history[:6] if is_authenticated else []

    # Step 7: If authenticated and history exists — run classify_trend()
    trend_context = ""
    trend_response = None
    
    if is_authenticated and len(recent_history) > 0:
        # History is ordered newest first. Reconstruct scores oldest first.
        scores = [record.get("score") for record in recent_history][::-1]
        scores.append(score)
        
        trend_info = classify_trend(scores)
        trend_label = trend_info.get("trend")
        
        # Get trend_context string from get_trend_prompt_context()
        trend_context = get_trend_prompt_context(trend_label)
        
        trend_response = TrendBlock(
            trend=trend_label,
            delta=trend_info.get("delta"),
            message=trend_info.get("message")
        )

    # Step 8: Get corpus techniques for tier
    corpus = getattr(request.app.state, "corpus", None)
    if corpus is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Reflection service is initializing. Please try again in a moment."
        )
    techniques = get_techniques_for_tier(corpus, tier)

    # Step 9: Call generate_summary() with trend_context if available
    from llm_client import generate_summary
    try:
        summary = generate_summary(techniques, score, tier, trend_context)
    except RuntimeError as e:
        logger.error(f"LLM generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to generate reflection at this time. Please try again."
        )

    milestones_response = None

    # Step 10: If authenticated and tier != crisis:
    if is_authenticated:
        now_str = now.isoformat()
        next_assessment = now + timedelta(days=ASSESSMENT_INTERVAL_DAYS)
        next_assessment_str = next_assessment.isoformat()
        
        # Save assessment to Supabase
        try:
            save_assessment(
                user_id=user_id,
                score=score,
                tier=tier,
                answers=body.answers,
                summary=summary,
                taken_at=now_str,
                next_assessment_at=next_assessment_str
            )
        except Exception as e:
            logger.exception("Failed to save assessment to DB")

        # Step 11: If authenticated — detect new milestones
        history_oldest_first = [{"score": record.get("score")} for record in history][::-1]
        
        already_awarded = []
        for i in range(1, len(history_oldest_first) + 1):
            sub_history = history_oldest_first[:i]
            for milestone in MILESTONES:
                if milestone["id"] not in already_awarded and milestone["condition"](sub_history):
                    already_awarded.append(milestone["id"])

        current_history = history_oldest_first + [{"score": score}]
        newly_earned_milestones = detect_new_milestones(current_history, already_awarded)
        
        # Save new milestones to Supabase milestones table
        if newly_earned_milestones:
            try:
                save_milestones(user_id, newly_earned_milestones)
            except Exception as e:
                logger.error(f"Failed to save milestones to DB: {e}")
                
        milestones_response = [
            Milestone(id=m["id"], message=m["message"]) for m in newly_earned_milestones
        ]
    crisis_payload = get_crisis_payload()
    logger.info(f"crisis_payload={crisis_payload}")
    # Step 12: Build and return response
    return AssessmentResponse(
        tier=tier,
        score=score,
        summary=summary,
        crisis=None,
        trend=trend_response,
        milestones=milestones_response,
        gate=gate_response,
        disclaimer=(
            "This tool is for psychoeducational and self-reflection purposes only. "
            "It is not a clinical assessment, diagnosis, or substitute for professional "
            "mental health care. If you are concerned about your mental health, please "
            "consult a qualified healthcare provider."
        )
    )
