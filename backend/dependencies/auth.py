from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from database import get_supabase
import os
from dotenv import load_dotenv

# Load settings from .env via python-dotenv
load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY")
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:3000")

if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET must be set in .env")

# OAuth2PasswordBearer flows extract the Bearer token from the Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_supabase)) -> dict:
    """
    Resolve the authenticated user to their canonical Supabase row.

    The token carries Google's raw `sub`, but the `users.id` is a derived UUID
    and the row is keyed by `email` (see auth.py). We therefore resolve by the
    token's `email` claim so this dependency returns the SAME row (and id) as the
    rest of the app — looking up by raw `sub` never matches and was the cause of
    spurious 403s on premium endpoints.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}"
        )

    email = payload.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing email claim."
        )

    try:
        res = db.table("users").select("id, email, tier").eq("email", email).limit(1).execute()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to look up user account."
        )

    rows = res.data or []
    if not rows:
        # No row yet → not a known (let alone premium) user.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found."
        )
    return rows[0]


def require_premium(user: dict = Depends(get_current_user)) -> str:
    """
    Allow only premium users. Returns the canonical user id (UUID) used as the
    foreign key in mood_logs / action_plans, so downstream queries resolve.
    """
    if user.get("tier") != "premium":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This feature requires MAEDOT Premium."
        )
    return user["id"]
