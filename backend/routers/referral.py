import json
import os
import secrets
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import HTMLResponse

from auth import get_current_user
from database import (
    save_referral,
    get_referral_by_token,
    get_referral_by_id,
    update_referral
)
from models import (
    ClinicsResponse,
    PublicClinicItem,
    ReferralBookRequest,
    ReferralBookResponse,
    ReferralStatusResponse
)
from referral_email import (
    send_referral_to_clinic,
    send_confirmation_to_patient,
    send_reassignment_notice_to_patient,
    send_final_decline_to_patient
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Load partner clinics data at startup
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLINICS_FILE_PATH = os.path.join(BASE_DIR, "data", "partner_clinics.json")

try:
    with open(CLINICS_FILE_PATH, "r", encoding="utf-8") as f:
        ALL_CLINICS = json.load(f)
except Exception as e:
    logger.error(f"Failed to load partner clinics config: {e}")
    ALL_CLINICS = []

# Filter clinics that accept referrals to use internally for active bookings
REFERRAL_CLINICS = [c for c in ALL_CLINICS if c.get("accepts_referrals") is True]


@router.get("/api/clinics", response_model=ClinicsResponse)
async def get_clinics():
    """
    Returns a list of all partner clinics (publicly available, no contact email exposed).
    """
    public_clinics = [
        PublicClinicItem(
            id=c["id"],
            name=c["name"],
            description=c["description"],
            specialties=c["specialties"],
            languages=c["languages"],
            response_window_hours=c["response_window_hours"]
        )
        for c in ALL_CLINICS
    ]
    return ClinicsResponse(clinics=public_clinics)


@router.post("/api/referral/book", response_model=ReferralBookResponse)
async def book_referral(
    body: ReferralBookRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Submits a booking referral request for an authenticated user to the first available partner clinic.
    """
    if body.phq9_tier == "crisis":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="For crisis situations, please contact emergency services immediately."
        )

    if not REFERRAL_CLINICS:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No partner clinics are currently available to accept referrals."
        )

    confirmation_token = secrets.token_urlsafe(32)
    first_clinic = REFERRAL_CLINICS[0]

    referral_data = {
        "user_id": current_user["id"],
        "patient_name": body.patient_name,
        "patient_email": body.patient_email,
        "patient_phone": body.patient_phone,
        "preferred_date": body.preferred_date,
        "preferred_time": body.preferred_time,
        "notes": body.notes,
        "phq9_score": body.phq9_score,
        "phq9_tier": body.phq9_tier,
        "assigned_clinic_id": first_clinic["id"],
        "assigned_clinic_name": first_clinic["name"],
        "status": "pending",
        "confirmation_token": confirmation_token,
        "fallback_attempts": 0
    }

    try:
        saved_referral = save_referral(referral_data)
    except Exception as e:
        logger.error(f"Failed to save referral: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while saving appointment request."
        )

    clinic_arg = {
        "name": first_clinic["name"],
        "email": first_clinic["contact_email"],
        "response_window_hours": first_clinic["response_window_hours"]
    }
    patient_arg = {
        "name": body.patient_name,
        "email": body.patient_email,
        "phone": body.patient_phone,
        "preferred_date": body.preferred_date,
        "preferred_time": body.preferred_time,
        "notes": body.notes
    }
    assessment_arg = {
        "score": body.phq9_score,
        "tier": body.phq9_tier
    }

    # Queue email send in the background
    background_tasks.add_task(
        send_referral_to_clinic,
        referral_id=str(saved_referral["id"]),
        confirmation_token=confirmation_token,
        clinic=clinic_arg,
        patient=patient_arg,
        assessment=assessment_arg
    )

    return ReferralBookResponse(
        referral_id=str(saved_referral["id"]),
        status="pending",
        clinic_name=first_clinic["name"],
        message="Your appointment request has been sent. We'll notify you once confirmed."
    )


@router.get("/api/referral/confirm", response_class=HTMLResponse)
async def confirm_referral(
    token: str,
    background_tasks: BackgroundTasks
):
    """
    Clinic confirmation endpoint. Activated by confirm URL in clinic email.
    """
    referral = get_referral_by_token(token)
    if not referral or referral.get("status") in ("confirmed", "declined"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found or already actioned."
        )

    now_str = datetime.now(timezone.utc).isoformat()
    updates = {
        "status": "confirmed",
        "confirmed_at": now_str
    }

    try:
        update_referral(referral["id"], updates)
    except Exception as e:
        logger.error(f"Failed to confirm referral {referral['id']}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while confirming referral."
        )

    # Queue confirmation email to patient
    background_tasks.add_task(
        send_confirmation_to_patient,
        patient_email=referral["patient_email"],
        patient_name=referral["patient_name"],
        clinic_name=referral["assigned_clinic_name"],
        preferred_date=referral["preferred_date"],
        preferred_time=referral["preferred_time"]
    )

    return "Referral confirmed. Thank you."


@router.get("/api/referral/decline", response_class=HTMLResponse)
async def decline_referral(
    token: str,
    background_tasks: BackgroundTasks
):
    """
    Clinic decline endpoint. Activated by decline URL in clinic email.
    Triggers fallback re-assignment to next partner clinic or final decline.
    """
    referral = get_referral_by_token(token)
    if not referral or referral.get("status") in ("confirmed", "declined"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found or already actioned."
        )

    now_str = datetime.now(timezone.utc).isoformat()
    fallback_attempts = referral.get("fallback_attempts", 0) + 1

    # Check if there is another clinic to fallback to
    if fallback_attempts < len(REFERRAL_CLINICS):
        # Next clinic is available
        next_clinic = REFERRAL_CLINICS[fallback_attempts]
        new_token = secrets.token_urlsafe(32)

        updates = {
            "status": "reassigned",
            "declined_at": now_str,
            "reassigned_at": now_str,
            "assigned_clinic_id": next_clinic["id"],
            "assigned_clinic_name": next_clinic["name"],
            "confirmation_token": new_token,
            "fallback_attempts": fallback_attempts
        }

        try:
            update_referral(referral["id"], updates)
        except Exception as e:
            logger.error(f"Failed to reassign referral {referral['id']}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error while declining/reassigning referral."
            )

        clinic_arg = {
            "name": next_clinic["name"],
            "email": next_clinic["contact_email"],
            "response_window_hours": next_clinic["response_window_hours"]
        }
        patient_arg = {
            "name": referral["patient_name"],
            "email": referral["patient_email"],
            "phone": referral.get("patient_phone"),
            "preferred_date": referral["preferred_date"],
            "preferred_time": referral["preferred_time"],
            "notes": referral.get("notes")
        }
        assessment_arg = {
            "score": referral["phq9_score"],
            "tier": referral["phq9_tier"]
        }

        # Queue new clinic email and patient reassignment notice
        background_tasks.add_task(
            send_referral_to_clinic,
            referral_id=str(referral["id"]),
            confirmation_token=new_token,
            clinic=clinic_arg,
            patient=patient_arg,
            assessment=assessment_arg
        )
        background_tasks.add_task(
            send_reassignment_notice_to_patient,
            patient_email=referral["patient_email"],
            patient_name=referral["patient_name"]
        )

    else:
        # No more clinics available - final decline
        updates = {
            "status": "declined",
            "declined_at": now_str,
            "fallback_attempts": fallback_attempts
        }

        try:
            update_referral(referral["id"], updates)
        except Exception as e:
            logger.error(f"Failed to set final decline for referral {referral['id']}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error while saving final decline."
            )

        # Queue final decline notice to patient
        background_tasks.add_task(
            send_final_decline_to_patient,
            patient_email=referral["patient_email"],
            patient_name=referral["patient_name"]
        )

    return "Response recorded. Thank you."


@router.get("/api/referral/status/{referral_id}", response_model=ReferralStatusResponse)
async def get_referral_status(
    referral_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns the current booking status of a referral owned by the authenticated user.
    """
    referral = get_referral_by_id(referral_id)
    if not referral:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral request not found."
        )

    if referral.get("user_id") != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this referral."
        )

    return ReferralStatusResponse(
        referral_id=str(referral["id"]),
        status=referral["status"],
        clinic_name=referral["assigned_clinic_name"],
        created_at=referral.get("created_at") or "",
        confirmed_at=referral.get("confirmed_at")
    )
