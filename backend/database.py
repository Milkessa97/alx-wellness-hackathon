from supabase import create_client, Client
from dotenv import load_dotenv
import os
import logging

logger = logging.getLogger(__name__)
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env. "
        "Get these from your Supabase project settings."
    )

_client: Client = None

def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client

def test_connection() -> bool:
    try:
        client = get_supabase()
        # Try a simple query to verify connection
        client.table("assessments").select("*").limit(1).execute()
        print("Supabase connection check: Successfully connected and queried 'assessments' table.")
        return True
    except Exception as e:
        print(f"Supabase connection test failed: {e}")
        return False


def save_assessment(user_id: str, score: int, tier: str, answers: list[int] = None, summary: str = None, taken_at: str = None, next_assessment_at: str = None):
    """
    Saves an assessment result to Supabase.
    """
    try:
        client = get_supabase()
        data = {
            "user_id": user_id,
            "score": score,
            "tier": tier,
        }
        if taken_at is not None:
            data["taken_at"] = taken_at
        if next_assessment_at is not None:
            data["next_assessment_at"] = next_assessment_at
            
        response = client.table("assessments").insert(data).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error saving assessment to Supabase: {e}")
        raise

def save_milestones(user_id: str, milestones: list[dict]):
    """
    Saves new milestones to Supabase.
    """
    if not milestones:
        return []
    try:
        client = get_supabase()
        data = [
            {
                "user_id": user_id,
                "milestone_id": m["id"],
                "message": m["message"]
            }
            for m in milestones
        ]
        response = client.table("milestones").insert(data).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error saving milestones to Supabase: {e}")
        raise


def get_user_assessments(user_id: str):
    """
    Retrieves assessment history for a user, ordered by creation date descending.
    """
    try:
        client = get_supabase()
        response = (
            client.table("assessments")
            .select("*")
            .eq("user_id", user_id)
            .order("taken_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as e:
        logger.error(f"Error fetching assessments from Supabase: {e}")
        return []


def get_user_milestones_count(user_id: str) -> int:
    """
    Counts the number of milestones earned by the user in Supabase.
    """
    try:
        client = get_supabase()
        response = (
            client.table("milestones")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        return len(response.data) if response.data else 0
    except Exception as e:
        logger.error(f"Error fetching milestones count from Supabase: {e}")
        return 0


def delete_user_assessments(user_id: str) -> int:
    """
    Deletes all assessments for a user.
    Returns the count of deleted assessments.
    """
    try:
        client = get_supabase()
        response = (
            client.table("assessments")
            .delete()
            .eq("user_id", user_id)
            .execute()
        )
        return len(response.data) if response.data else 0
    except Exception as e:
        logger.error(f"Error deleting assessments for user {user_id}: {e}")
        raise


def delete_user_milestones(user_id: str) -> int:
    """
    Deletes all milestones for a user.
    Returns the count of deleted milestones.
    """
    try:
        client = get_supabase()
        response = (
            client.table("milestones")
            .delete()
            .eq("user_id", user_id)
            .execute()
        )
        return len(response.data) if response.data else 0
    except Exception as e:
        logger.error(f"Error deleting milestones for user {user_id}: {e}")
        raise


def save_referral(data: dict) -> dict:
    """
    Saves a referral record to Supabase.
    """
    try:
        client = get_supabase()
        response = client.table("referrals").insert(data).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        raise RuntimeError("No data returned from save_referral insert.")
    except Exception as e:
        logger.error(f"Error saving referral to Supabase: {e}")
        raise


def get_referral_by_token(token: str) -> dict | None:
    """
    Retrieves a referral record by its confirmation token.
    """
    try:
        client = get_supabase()
        response = (
            client.table("referrals")
            .select("*")
            .eq("confirmation_token", token)
            .execute()
        )
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error fetching referral by token: {e}")
        return None


def get_referral_by_id(referral_id: str) -> dict | None:
    """
    Retrieves a referral record by its ID.
    """
    try:
        client = get_supabase()
        response = (
            client.table("referrals")
            .select("*")
            .eq("id", referral_id)
            .execute()
        )
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error fetching referral by ID: {e}")
        return None


def update_referral(referral_id: str, updates: dict) -> dict:
    """
    Updates a referral record in Supabase.
    """
    try:
        client = get_supabase()
        response = (
            client.table("referrals")
            .update(updates)
            .eq("id", referral_id)
            .execute()
        )
        if response.data and len(response.data) > 0:
            return response.data[0]
        raise RuntimeError(f"No data returned from update_referral for ID {referral_id}")
    except Exception as e:
        logger.error(f"Error updating referral in Supabase: {e}")
        raise



