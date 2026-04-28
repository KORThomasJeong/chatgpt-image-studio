from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import User
from app.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    verify_password,
)

router = APIRouter(redirect_slashes=False)


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    is_admin: bool
    has_custom_key: bool


class UserResponse(BaseModel):
    id: int
    username: str
    is_admin: bool
    has_custom_key: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_REFRESH_COOKIE = "refresh_token"
_REFRESH_COOKIE_MAX_AGE = 14 * 24 * 60 * 60  # 14 days in seconds


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=_REFRESH_COOKIE,
        value=token,
        httponly=True,
        secure=False,  # set True behind HTTPS in production
        samesite="lax",
        max_age=_REFRESH_COOKIE_MAX_AGE,
        path="/",
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TokenResponse:
    """Authenticate a user and return a JWT access token + httpOnly refresh cookie."""
    result = await session.execute(select(User).where(User.username == body.username))
    user: User | None = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    access_token = create_access_token(
        user_id=user.id, username=user.username, is_admin=user.is_admin
    )
    refresh_token = create_refresh_token(user_id=user.id)
    _set_refresh_cookie(response, refresh_token)

    return TokenResponse(
        access_token=access_token,
        user_id=user.id,
        username=user.username,
        is_admin=user.is_admin,
        has_custom_key=bool(user.openai_api_key_encrypted),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session)],
    refresh_token: Annotated[str | None, Cookie(alias=_REFRESH_COOKIE)] = None,
) -> TokenResponse:
    """Issue a new access token using the httpOnly refresh cookie."""
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    payload = decode_token(refresh_token)

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    result = await session.execute(select(User).where(User.id == int(user_id_str)))
    user: User | None = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    access_token = create_access_token(
        user_id=user.id, username=user.username, is_admin=user.is_admin
    )
    new_refresh = create_refresh_token(user_id=user.id)
    _set_refresh_cookie(response, new_refresh)

    return TokenResponse(
        access_token=access_token,
        user_id=user.id,
        username=user.username,
        is_admin=user.is_admin,
        has_custom_key=bool(user.openai_api_key_encrypted),
    )


@router.post("/logout")
async def logout(response: Response):
    """Clear the refresh-token cookie."""
    response.delete_cookie(key=_REFRESH_COOKIE, path="/")
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """Return the authenticated user's profile."""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        is_admin=current_user.is_admin,
        has_custom_key=bool(current_user.openai_api_key_encrypted),
        created_at=current_user.created_at,
    )
