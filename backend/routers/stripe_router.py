import os
import logging
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Header, status as fastapi_status
from pydantic import BaseModel

from auth import get_current_user
from database import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize Stripe API Key
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "").strip()
stripe.api_key = STRIPE_SECRET_KEY

# Webhook Secret for validation
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
MONTHLY_PRICE_ID = os.getenv("STRIPE_PRICE_MONTHLY")
ANNUAL_PRICE_ID = os.getenv("STRIPE_PRICE_ANNUAL")

class CreateCheckoutRequest(BaseModel):
    price_id: str
    success_url: str
    cancel_url: str


@router.post("/stripe/create-checkout")
async def create_checkout(
    body: CreateCheckoutRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Creates a Stripe Checkout Session for subscription, creating the Stripe Customer first if needed.
    """
    user_id = current_user.get("id")
    email = current_user.get("email")
    name = current_user.get("name", "")

    if not email:
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail="User email is required to create a checkout session."
        )

    stripe_customer_id = current_user.get("stripe_customer_id")

    # If missing, create Stripe customer and update Supabase
    if not stripe_customer_id:
        try:
            customer = stripe.Customer.create(email=email, name=name)
            stripe_customer_id = customer.id
            
            supabase = get_supabase()
            supabase.table("users").update({"stripe_customer_id": stripe_customer_id}).eq("id", user_id).execute()
            logger.info(f"Created Stripe customer {stripe_customer_id} for user {user_id}")
        except Exception as e:
            logger.error(f"Error creating Stripe customer: {e}")
            raise HTTPException(
                status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to register billing customer details."
            )
    def convertPriceId(body_price_id):
        logger.info(f"Received plan from frontend: [{body_price_id}]")

        if body_price_id in ["monthly", "price_monthly"]:
            return MONTHLY_PRICE_ID

        elif body_price_id in ["annual", "price_annual"]:
            return ANNUAL_PRICE_ID

        if body_price_id.startswith("price_"):
            return body_price_id

        raise HTTPException(
            status_code=400,
            detail=f"Invalid plan received: {body_price_id}"
        )
    # Create Checkout Session
    try:
        
        session = stripe.checkout.Session.create(
            customer=stripe_customer_id,
            payment_method_types=['card'],
            line_items=[{
                "price": convertPriceId(body.price_id),
                "quantity": 1
            }],
            mode='subscription',
            subscription_data={
                "trial_period_days": 14
            },
            success_url=body.success_url,
            cancel_url=body.cancel_url,
            allow_promotion_codes=True,
        )
        return {"checkout_url": session.url}
    except HTTPException:
        raise
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating checkout session: {e}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checkout session."
        )


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request, stripe_signature: Optional[str] = Header(None)):
    """
    Webhook receiver for Stripe billing events.
    """
    if not stripe_signature:
        logger.error("Missing stripe-signature header")
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail="Missing stripe-signature header"
        )

    try:
        payload = await request.body()
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Webhook signature verification failed: {e}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature"
        )
    except ValueError as e:
        logger.error(f"Webhook invalid payload: {e}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload"
        )

    event_type = event.get("type")
    data_object = event.get("data", {}).get("object", {})

    supabase = get_supabase()

    if event_type == "checkout.session.completed":
        customer_id = data_object.get("customer")
        subscription_id = data_object.get("subscription")

        if not customer_id:
            logger.error("checkout.session.completed missing customer ID")
            return {"status": "ignored"}

        # Look up user in database
        res = supabase.table("users").select("*").eq("stripe_customer_id", customer_id).execute()
        if not res.data:
            logger.error(f"User with stripe_customer_id {customer_id} not found in database.")
            raise HTTPException(
                status_code=fastapi_status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        user = res.data[0]
        user_id = user["id"]

        trial_ends_at = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()

        supabase.table("users").update({
            "tier": "premium",
            "subscription_id": subscription_id,
            "trial_ends_at": trial_ends_at
        }).eq("id", user_id).execute()

        user_id_hash = hashlib.sha256(user_id.encode()).hexdigest()
        logger.info(f"User upgraded to premium | {user_id_hash}")

    elif event_type == "customer.subscription.deleted":
        customer_id = data_object.get("customer")

        if not customer_id:
            logger.error("customer.subscription.deleted missing customer ID")
            return {"status": "ignored"}

        # Look up user in database
        res = supabase.table("users").select("*").eq("stripe_customer_id", customer_id).execute()
        if not res.data:
            logger.error(f"User with stripe_customer_id {customer_id} not found in database.")
            raise HTTPException(
                status_code=fastapi_status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        user = res.data[0]
        user_id = user["id"]

        supabase.table("users").update({
            "tier": "free",
            "subscription_id": None
        }).eq("id", user_id).execute()

        user_id_hash = hashlib.sha256(user_id.encode()).hexdigest()
        logger.info(f"Subscription cancelled | {user_id_hash}")

    elif event_type == "customer.subscription.updated":
        customer_id = data_object.get("customer")
        status = data_object.get("status")
        subscription_id = data_object.get("id")

        if not customer_id:
            logger.error("customer.subscription.updated missing customer ID")
            return {"status": "ignored"}

        # Look up user in database
        res = supabase.table("users").select("*").eq("stripe_customer_id", customer_id).execute()
        if not res.data:
            logger.error(f"User with stripe_customer_id {customer_id} not found in database.")
            raise HTTPException(
                status_code=fastapi_status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        user = res.data[0]
        user_id = user["id"]

        updates = {}
        if status == 'active':
            updates["tier"] = "premium"
            updates["subscription_id"] = subscription_id
        elif status in ['past_due', 'unpaid', 'canceled']:
            updates["tier"] = "free"
            updates["subscription_id"] = None if status == 'canceled' else subscription_id

        if updates:
            supabase.table("users").update(updates).eq("id", user_id).execute()
            logger.info(f"Subscription updated for user {user_id}: {updates}")

    else:
        # All other events are acknowledged as 200 immediately
        return {"status": "ignored"}

    return {"status": "success"}


@router.get("/stripe/subscription-status")
async def subscription_status(current_user: dict = Depends(get_current_user)):
    """
    Retrieves the subscription status of the authenticated user.
    """
    tier = current_user.get("tier", "free")
    trial_ends_at = current_user.get("trial_ends_at")
    subscription_id = current_user.get("subscription_id")

    is_trial = False
    if trial_ends_at:
        try:
            trial_ends_dt = datetime.fromisoformat(trial_ends_at)
            is_trial = trial_ends_dt > datetime.now(timezone.utc)
        except Exception:
            is_trial = False

    return {
        "tier": tier,
        "trial_ends_at": trial_ends_at,
        "is_trial": is_trial,
        "subscription_id": subscription_id
    }


@router.post("/stripe/cancel")
async def cancel_subscription(current_user: dict = Depends(get_current_user)):
    """
    Cancels the subscription at period end, or deletes it immediately if it's a trial.
    """
    subscription_id = current_user.get("subscription_id")

    if not subscription_id:
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail="No active subscription found."
        )

    # Detect if user is currently on a trial
    trial_ends_at = current_user.get("trial_ends_at")
    is_trial = False
    if trial_ends_at:
        try:
            trial_ends_dt = datetime.fromisoformat(trial_ends_at)
            is_trial = trial_ends_dt > datetime.now(timezone.utc)
        except Exception:
            is_trial = False

    try:
        if is_trial:
            # Delete subscription immediately to end trial
            stripe.Subscription.delete(subscription_id)
            # Update user tier to free immediately in the database
            supabase = get_supabase()
            supabase.table("users").update({
                "tier": "free",
                "subscription_id": None
            }).eq("id", current_user.get("id")).execute()
            return {"message": "Your premium trial has been dismissed."}
        else:
            # Modify to cancel at period end for paid subscriptions
            stripe.Subscription.modify(subscription_id, cancel_at_period_end=True)
            return {"message": "Your subscription will end at the current billing period."}
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error modifying/deleting subscription {subscription_id}: {e}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error modifying/deleting subscription {subscription_id}: {e}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription."
        )
