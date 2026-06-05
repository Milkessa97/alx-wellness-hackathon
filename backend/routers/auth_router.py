import os
import logging
from datetime import datetime, timezone, timedelta

import httpx
from fastapi import APIRouter, HTTPException, status
from jose import jwt

from auth import JWT_SECRET, JWT_ALGORITHM
from models import GoogleAuthRequest, AuthTokenResponse, AuthUser

logger = logging.getLogger(__name__)

router = APIRouter()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
VALID_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}

# How long the app-issued JWT stays valid.
TOKEN_TTL_DAYS = 7


async def _verify_google_credential(credential: str) -> dict:
    """
    Verifies a Google Identity Services ID token via Google's tokeninfo endpoint.
    Returns the validated claims dict, or raises HTTPException(401) if invalid.
    """
    if not GOOGLE_CLIENT_ID:
        # Misconfiguration: we cannot validate the audience without the client ID.
        logger.error("GOOGLE_CLIENT_ID is not set — cannot verify Google credentials.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication is not configured on the server.",
        )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(GOOGLE_TOKENINFO_URL, params={"id_token": credential})
    except httpx.HTTPError as e:
        logger.warning(f"Google tokeninfo request failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach Google to verify your sign-in. Please try again.",
        )

    if resp.status_code != 200:
        logger.warning(f"Google rejected credential: {resp.status_code} {resp.text}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google credential.",
        )

    claims = resp.json()

    # Audience must match our OAuth client ID.
    if claims.get("aud") != GOOGLE_CLIENT_ID:
        logger.warning(f"Google credential aud mismatch: {claims.get('aud')}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This sign-in was not issued for this application.",
        )

    # Issuer must be Google.
    if claims.get("iss") not in VALID_ISSUERS:
        logger.warning(f"Google credential bad issuer: {claims.get('iss')}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token issuer.",
        )

    # Email must be present and verified.
    if not claims.get("email") or claims.get("email_verified") not in ("true", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google account email is missing or unverified.",
        )

    return claims


@router.post("/api/auth/google", response_model=AuthTokenResponse)
async def google_sign_in(body: GoogleAuthRequest) -> AuthTokenResponse:
    """
    Exchanges a Google Identity Services credential for an app-issued HS256 JWT.

    The returned token carries `sub`/`email`/`name` and is accepted by the
    `get_current_user` / `get_optional_user` dependencies on protected routes.
    """
    claims = await _verify_google_credential(body.credential)

    email = claims["email"]
    name = claims.get("name") or email.split("@")[0]
    sub = claims.get("sub")
    picture = claims.get("picture")

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=TOKEN_TTL_DAYS)

    app_claims = {
        "sub": sub,
        "email": email,
        "name": name,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(app_claims, JWT_SECRET, algorithm=JWT_ALGORITHM)

    logger.info(f"Issued app JWT for user | email={email} | sub={sub}")

    return AuthTokenResponse(
        token=token,
        user=AuthUser(email=email, name=name, image=picture),
        expires=expires_at.isoformat(),
    )
