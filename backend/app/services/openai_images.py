"""
OpenAI Images Service — uses the official openai Python SDK.
"""
import base64
import io

import httpx
from fastapi import HTTPException
from openai import AsyncOpenAI, APIStatusError


async def _item_to_bytes(item, client: httpx.AsyncClient) -> bytes | None:
    """Extract image bytes from a response item (b64_json or url)."""
    if item.b64_json:
        return base64.b64decode(item.b64_json)
    if item.url:
        r = await client.get(item.url)
        if r.status_code == 200:
            return r.content
    return None


async def generate_image(
    prompt: str,
    model: str,
    size: str,
    quality: str,
    n: int,
    api_key: str,
) -> list[bytes]:
    """Call images.generate and return a list of PNG bytes (one per image)."""
    openai = AsyncOpenAI(api_key=api_key)
    try:
        response = await openai.images.generate(
            model=model,
            prompt=prompt,
            n=n,
            size=size,  # type: ignore[arg-type]
            quality=quality,  # type: ignore[arg-type]
        )
    except APIStatusError as exc:
        msg = exc.message or str(exc)
        raise HTTPException(status_code=502, detail=msg) from exc

    result: list[bytes] = []
    async with httpx.AsyncClient(timeout=60) as http:
        for item in response.data:
            data = await _item_to_bytes(item, http)
            if data:
                result.append(data)
    return result


async def edit_image(
    prompt: str,
    image_bytes: bytes,
    mask_bytes: bytes | None,
    model: str,
    size: str,
    api_key: str,
) -> bytes:
    """Call images.edit (multipart) and return PNG bytes."""
    openai = AsyncOpenAI(api_key=api_key)

    image_file = ("image.png", io.BytesIO(image_bytes), "image/png")
    mask_file = ("mask.png", io.BytesIO(mask_bytes), "image/png") if mask_bytes else None

    try:
        kwargs: dict = dict(
            model=model,
            image=image_file,
            prompt=prompt,
            n=1,
            size=size,  # type: ignore[arg-type]
        )
        if mask_file is not None:
            kwargs["mask"] = mask_file

        response = await openai.images.edit(**kwargs)
    except APIStatusError as exc:
        msg = exc.message or str(exc)
        raise HTTPException(status_code=502, detail=msg) from exc

    items = response.data
    if not items:
        raise HTTPException(status_code=502, detail="OpenAI returned no image data")

    async with httpx.AsyncClient(timeout=60) as http:
        data = await _item_to_bytes(items[0], http)

    if not data:
        raise HTTPException(status_code=502, detail="OpenAI returned no image data")
    return data
