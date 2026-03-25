import uuid
from datetime import datetime, timedelta, timezone

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from google_auth_oauthlib.flow import Flow
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.utils.jwt import create_access_token, create_refresh_token, hash_refresh_token

GOOGLE_SCOPES = ["openid", "email", "profile"]


def _build_google_flow() -> Flow:
    client_config = {
        "web": {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.google_redirect_uri],
        }
    }
    flow = Flow.from_client_config(client_config, scopes=GOOGLE_SCOPES)
    flow.redirect_uri = settings.google_redirect_uri
    return flow


def get_google_auth_url() -> str:
    flow = _build_google_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return auth_url


async def authenticate_google(code: str, db: AsyncSession) -> dict:
    """Exchange Google auth code for tokens, upsert user, return app tokens + user."""
    flow = _build_google_flow()
    flow.fetch_token(code=code)

    credentials = flow.credentials
    id_info = id_token.verify_oauth2_token(
        credentials.id_token,
        google_requests.Request(),
        settings.google_client_id,
    )

    google_sub = id_info["sub"]
    email = id_info["email"]
    name = id_info.get("name", "")
    picture = id_info.get("picture")

    # Upsert user
    result = await db.execute(select(User).where(User.google_sub == google_sub))
    user = result.scalar_one_or_none()

    if user:
        user.name = name
        user.picture_url = picture
        user.email = email
        user.updated_at = datetime.now(timezone.utc)
        db.add(user)
    else:
        user = User(
            email=email,
            name=name,
            picture_url=picture,
            google_sub=google_sub,
        )
        db.add(user)
        await db.flush()

    # Generate tokens
    access_token = create_access_token(str(user.id), user.email)
    raw_refresh, token_hash = create_refresh_token()

    refresh_token_record = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expiry_days),
    )
    db.add(refresh_token_record)

    return {
        "access_token": access_token,
        "refresh_token": raw_refresh,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "picture_url": user.picture_url,
        },
    }


async def refresh_tokens(raw_refresh_token: str, db: AsyncSession) -> dict:
    """Rotate refresh token — validate old one, revoke it, issue new pair."""
    token_hash = hash_refresh_token(raw_refresh_token)

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
    )
    old_token = result.scalar_one_or_none()
    if not old_token:
        raise ValueError("Invalid or expired refresh token")

    # Revoke old token
    old_token.revoked_at = datetime.now(timezone.utc)
    db.add(old_token)

    # Get user
    user_result = await db.execute(select(User).where(User.id == old_token.user_id))
    user = user_result.scalar_one()

    # Issue new tokens
    access_token = create_access_token(str(user.id), user.email)
    new_raw_refresh, new_hash = create_refresh_token()

    new_refresh_record = RefreshToken(
        user_id=user.id,
        token_hash=new_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expiry_days),
    )
    db.add(new_refresh_record)

    return {
        "access_token": access_token,
        "refresh_token": new_raw_refresh,
    }


async def revoke_all_tokens(user_id: uuid.UUID, db: AsyncSession) -> None:
    """Revoke all refresh tokens for a user (logout everywhere)."""
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        )
    )
    tokens = result.scalars().all()
    now = datetime.now(timezone.utc)
    for token in tokens:
        token.revoked_at = now
        db.add(token)
