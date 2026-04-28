"""
Settings router — per-user API key and password management.
"""
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import User
from app.security import decrypt_api_key, encrypt_api_key, get_current_user, hash_password, verify_password

settings_router = APIRouter(tags=["settings"])

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class SetKeyRequest(BaseModel):
    api_key: str = Field(min_length=10)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class KeyStatusResponse(BaseModel):
    has_key: bool
    key_preview: Optional[str]  # "...xYZW" — last 4 chars only


# ---------------------------------------------------------------------------
# GET /openai-key
# ---------------------------------------------------------------------------


@settings_router.get("/openai-key", response_model=KeyStatusResponse)
async def get_key_status(
    current_user: User = Depends(get_current_user),
) -> KeyStatusResponse:
    if not current_user.openai_api_key_encrypted:
        return KeyStatusResponse(has_key=False, key_preview=None)

    decrypted = decrypt_api_key(current_user.openai_api_key_encrypted)
    preview = f"...{decrypted[-4:]}" if len(decrypted) >= 4 else "...****"
    return KeyStatusResponse(has_key=True, key_preview=preview)


# ---------------------------------------------------------------------------
# PUT /openai-key
# ---------------------------------------------------------------------------


@settings_router.put("/openai-key", response_model=KeyStatusResponse)
async def set_openai_key(
    body: SetKeyRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> KeyStatusResponse:
    # Validate the key by hitting the OpenAI models endpoint
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://api.openai.com/v1/models",
            headers={"Authorization": f"Bearer {body.api_key}"},
        )

    if resp.status_code == 401:
        raise HTTPException(status_code=422, detail="Invalid API key")

    # Any other non-2xx response is an upstream issue; we still accept the key
    # (the user may have quota issues but the key itself could be valid).

    current_user.openai_api_key_encrypted = encrypt_api_key(body.api_key)
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)

    preview = f"...{body.api_key[-4:]}" if len(body.api_key) >= 4 else "...****"
    return KeyStatusResponse(has_key=True, key_preview=preview)


# ---------------------------------------------------------------------------
# DELETE /openai-key
# ---------------------------------------------------------------------------


@settings_router.delete("/openai-key", status_code=204, response_class=Response)
async def delete_openai_key(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    current_user.openai_api_key_encrypted = None
    session.add(current_user)
    await session.commit()


# ---------------------------------------------------------------------------
# PUT /password
# ---------------------------------------------------------------------------


@settings_router.put("/password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=422, detail="Current password is incorrect")

    current_user.password_hash = hash_password(body.new_password)
    session.add(current_user)
    await session.commit()
    return {"detail": "Password updated successfully"}
