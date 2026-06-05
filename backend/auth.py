from fastapi import Depends, HTTPException, Header, status
from jose import JWTError, jwt
from database import get_supabase
from dotenv import load_dotenv
import os
import uuid
import logging
from typing import Optional

logger = logging.getLogger(__name__)
load_dotenv()


def _stable_user_id(sub: Optional[str], email: str) -> str:
    """
    Derives a deterministic UUID for a user.

    The Supabase `users.id` column is a UUID, but auth providers hand out
    non-UUID subject ids (e.g. Google's numeric `sub` like "1032013346..."),
    which cannot be stored in a UUID column. Hashing the provider subject
    (falling back to email) into a UUIDv5 yields a stable, valid UUID so the
    same account always resolves to the same row across requests.
    """
    seed = f"google:{sub}" if sub else f"email:{email}"
    return str(uuid.uuid5(uuid.NAMESPACE_URL, seed))

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET must be set in .env. "
        "Get this from your NextAuth configuration."
    )

async def verify_token(token: str) -> dict:
    """
    Decodes and validates the NextAuth JWT token.
    Raises HTTPException 401 if invalid or expired.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        # NextAuth tokens often have sub (subject) as ID, email, and name.
        if "email" not in payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token is missing email claim."
            )
        return payload
    except JWTError as e:
        logger.warning(f"JWT Verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials: token is invalid or expired."
        )

async def get_current_user(
    authorization: str = Header(None)
) -> dict:
    """
    FastAPI dependency to enforce authentication.
    Verifies the JWT and upserts the user record in Supabase.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is missing."
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization scheme. Use 'Bearer <token>'."
        )

    token = authorization.split(" ", 1)[1]
    payload = await verify_token(token)

    email = payload.get("email")
    name = payload.get("name", "")
    sub = payload.get("sub")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing email address."
        )

    # The DB primary key is a UUID; Google's `sub` is not. Derive a stable UUID
    # so the user always maps to the same row and downstream foreign keys
    # (assessments.user_id, referrals.user_id) receive a valid UUID.
    stable_id = _stable_user_id(sub, email)

    try:
        supabase = get_supabase()
        # Lookup user by email
        res = supabase.table("users").select("*").eq("email", email).execute()
        if res.data:
            return res.data[0]

        # User doesn't exist, create it (upsert on the UUID primary key)
        user_record = {
            "id": stable_id,
            "email": email,
            "name": name
        }
        insert_res = supabase.table("users").upsert(user_record).execute()
        if insert_res.data:
            return insert_res.data[0]
        return user_record
    except Exception as e:
        logger.error(f"Error looking up or creating user in database: {e}")
        # In case the users table doesn't exist or DB errors, fall back to a
        # valid (stable) UUID so downstream code never receives a non-UUID id.
        return {"id": stable_id, "email": email, "name": name}

async def get_optional_user(
    authorization: str = Header(None)
) -> Optional[dict]:
    """
    FastAPI dependency that attempts to authenticate the user but returns None if no
    valid authorization token is provided. Crucial for endpoints supporting public access.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None

    try:
        token = authorization.split(" ", 1)[1]
        payload = await verify_token(token)
        email = payload.get("email")
        if not email:
            return None

        # Return user dict (retrieve or create in DB)
        # Reuse get_current_user logic but suppress authentication exceptions
        return await get_current_user(authorization)
    except HTTPException:
        return None
    except Exception as e:
        logger.warning(f"Optional auth check encountered error: {e}")
        return None


async def require_premium(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Dependency that blocks non-premium users.
    Use on endpoints that are premium-only.
    Raises 403 with upgrade message if user is free tier.
    """
    if current_user.get('tier') != 'premium':
        raise HTTPException(
            status_code=403,
            detail={
                "code": "PREMIUM_REQUIRED",
                "message": "This feature requires MAEDOT Premium.",
                "upgrade_url": "/pricing"
            }
        )
    return current_user
