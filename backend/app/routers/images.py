"""
Images router — generate, edit, list, serve and delete user images.
"""
import os
import uuid
from datetime import datetime
from typing import Optional

import aiofiles
import aiofiles.os
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_session
from app.models import Image, User
from app.security import decrypt_api_key, get_current_user
from app.services.openai_images import edit_image, generate_image

images_router = APIRouter(tags=["images"])

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

_ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/webp"}
_MAX_UPLOAD_BYTES = 4 * 1024 * 1024  # 4 MB


class GenerateRequest(BaseModel):
    prompt: str
    model: str = "gpt-image-1"
    size: str = "1024x1024"
    quality: str = "standard"
    n: int = Field(default=1, ge=1, le=4)


class ImageResponse(BaseModel):
    id: str  # UUID as string
    kind: str
    prompt: str
    model: str
    size: str
    quality: str
    status: str
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _resolve_api_key(user: User) -> str:
    """Return the user's personal key (decrypted) or fall back to server key."""
    if user.openai_api_key_encrypted:
        return decrypt_api_key(user.openai_api_key_encrypted)
    return settings.OPENAI_API_KEY


async def _ensure_dir(path: str) -> None:
    """Create directory if it does not exist (async-safe)."""
    await aiofiles.os.makedirs(path, exist_ok=True)


def _image_response(image: Image) -> ImageResponse:
    return ImageResponse(
        id=str(image.id),
        kind=image.kind,
        prompt=image.prompt,
        model=image.model,
        size=image.size,
        quality=image.quality,
        status=image.status,
        error_message=image.error_message,
        created_at=image.created_at,
    )


# ---------------------------------------------------------------------------
# POST /generate
# ---------------------------------------------------------------------------


@images_router.post("/generate", response_model=list[ImageResponse])
async def generate(
    body: GenerateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ImageResponse]:
    api_key = _resolve_api_key(current_user)
    images_dir = os.path.join(settings.DATA_DIR, "images")
    await _ensure_dir(images_dir)

    # Pre-allocate one Image record per requested slot so we can track status.
    pending_records: list[Image] = []
    for _ in range(body.n):
        record = Image(
            user_id=current_user.id,
            kind="generate",
            prompt=body.prompt,
            model=body.model,
            size=body.size,
            quality=body.quality,
            status="pending",
        )
        session.add(record)
        pending_records.append(record)

    await session.commit()
    for r in pending_records:
        await session.refresh(r)

    try:
        image_bytes_list = await generate_image(
            prompt=body.prompt,
            model=body.model,
            size=body.size,
            quality=body.quality,
            n=body.n,
            api_key=api_key,
        )
    except Exception as exc:
        for record in pending_records:
            record.status = "failed"
            record.error_message = str(exc)
            session.add(record)
        await session.commit()
        raise

    responses: list[ImageResponse] = []

    # Pair returned bytes with pre-created records
    for record, img_bytes in zip(pending_records, image_bytes_list):
        filename = f"{record.id}.png"
        relative_path = f"images/{filename}"
        absolute_path = os.path.join(settings.DATA_DIR, relative_path)
        async with aiofiles.open(absolute_path, "wb") as f:
            await f.write(img_bytes)
        record.status = "completed"
        record.file_path = relative_path
        session.add(record)
        responses.append(_image_response(record))

    # If OpenAI returned fewer images than requested, mark extras as failed
    for record in pending_records[len(image_bytes_list):]:
        record.status = "failed"
        record.error_message = "No image returned by OpenAI for this slot"
        session.add(record)

    await session.commit()
    return responses


# ---------------------------------------------------------------------------
# POST /edit  (multipart form)
# ---------------------------------------------------------------------------


@images_router.post("/edit", response_model=ImageResponse)
async def edit(
    prompt: str = Form(...),
    model: str = Form("gpt-image-1"),
    size: str = Form("1024x1024"),
    image: UploadFile = File(...),
    mask: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ImageResponse:
    # Validate content type
    if image.content_type not in _ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Image must be PNG, JPEG or WebP; got '{image.content_type}'"
            ),
        )

    # Read and size-check the source image
    image_bytes = await image.read()
    if len(image_bytes) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=422, detail="Image exceeds 4 MB limit")

    # Optionally read mask
    mask_bytes: bytes | None = None
    if mask is not None:
        mask_bytes = await mask.read()
        if len(mask_bytes) > _MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=422, detail="Mask exceeds 4 MB limit")

    api_key = _resolve_api_key(current_user)
    uploads_dir = os.path.join(settings.DATA_DIR, "uploads")
    images_dir = os.path.join(settings.DATA_DIR, "images")
    await _ensure_dir(uploads_dir)
    await _ensure_dir(images_dir)

    # Create a pending DB record first to obtain the UUID
    record = Image(
        user_id=current_user.id,
        kind="edit",
        prompt=prompt,
        model=model,
        size=size,
        quality="standard",
        status="pending",
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)

    # Save the uploaded source image using the record's UUID
    src_filename = f"{record.id}_src.png"
    src_relative = f"uploads/{src_filename}"
    src_absolute = os.path.join(settings.DATA_DIR, src_relative)
    async with aiofiles.open(src_absolute, "wb") as f:
        await f.write(image_bytes)

    record.source_image_path = src_relative
    session.add(record)
    await session.commit()

    try:
        result_bytes = await edit_image(
            prompt=prompt,
            image_bytes=image_bytes,
            mask_bytes=mask_bytes,
            model=model,
            size=size,
            api_key=api_key,
        )
    except Exception as exc:
        record.status = "failed"
        record.error_message = str(exc)
        session.add(record)
        await session.commit()
        raise

    # Save the generated result image
    out_filename = f"{record.id}.png"
    out_relative = f"images/{out_filename}"
    out_absolute = os.path.join(settings.DATA_DIR, out_relative)
    async with aiofiles.open(out_absolute, "wb") as f:
        await f.write(result_bytes)

    record.status = "completed"
    record.file_path = out_relative
    session.add(record)
    await session.commit()

    return _image_response(record)


# ---------------------------------------------------------------------------
# GET /  — list images with cursor pagination
# ---------------------------------------------------------------------------


@images_router.get("/", response_model=dict)
async def list_images(
    limit: int = Query(default=20, ge=1, le=100),
    cursor: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    stmt = select(Image).where(Image.user_id == current_user.id)

    if cursor is not None:
        # Resolve the cursor UUID to a timestamp for keyset pagination
        try:
            cursor_uuid = uuid.UUID(cursor)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid cursor format")

        cursor_result = await session.execute(
            select(Image).where(Image.id == cursor_uuid)
        )
        cursor_record = cursor_result.scalar_one_or_none()
        if cursor_record is None:
            raise HTTPException(status_code=400, detail="Invalid cursor: record not found")

        stmt = stmt.where(Image.created_at < cursor_record.created_at)

    stmt = stmt.order_by(Image.created_at.desc()).limit(limit)
    result = await session.execute(stmt)
    rows = result.scalars().all()

    items = [_image_response(r) for r in rows]
    next_cursor: Optional[str] = str(rows[-1].id) if len(rows) == limit else None

    return {"items": items, "next_cursor": next_cursor}


# ---------------------------------------------------------------------------
# GET /{image_id}/file
# ---------------------------------------------------------------------------


@images_router.get("/{image_id}/file")
async def serve_image(
    image_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    try:
        image_uuid = uuid.UUID(image_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Image not found")

    result = await session.execute(select(Image).where(Image.id == image_uuid))
    image = result.scalar_one_or_none()

    if image is None or image.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Image not found")

    if not image.file_path:
        raise HTTPException(status_code=404, detail="Image file not yet available")

    absolute_path = os.path.join(settings.DATA_DIR, image.file_path)
    if not os.path.exists(absolute_path):
        raise HTTPException(status_code=404, detail="Image file missing from disk")

    async def _iter_file():
        async with aiofiles.open(absolute_path, "rb") as f:
            while True:
                chunk = await f.read(65536)
                if not chunk:
                    break
                yield chunk

    return StreamingResponse(_iter_file(), media_type="image/png")


# ---------------------------------------------------------------------------
# DELETE /{image_id}
# ---------------------------------------------------------------------------


@images_router.delete("/{image_id}", status_code=204, response_class=Response)
async def delete_image(
    image_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    try:
        image_uuid = uuid.UUID(image_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Image not found")

    result = await session.execute(select(Image).where(Image.id == image_uuid))
    image = result.scalar_one_or_none()

    if image is None or image.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Image not found")

    # Remove associated files from disk (best-effort)
    for rel_path in (image.file_path, image.source_image_path, image.mask_path):
        if rel_path:
            absolute_path = os.path.join(settings.DATA_DIR, rel_path)
            try:
                await aiofiles.os.remove(absolute_path)
            except FileNotFoundError:
                pass

    await session.delete(image)
    await session.commit()
