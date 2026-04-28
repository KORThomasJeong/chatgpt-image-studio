"""
OpenAI Images Service — uses the official openai Python SDK.
"""
import base64
import io

from fastapi import HTTPException
from openai import AsyncOpenAI, APIStatusError


async def generate_image(
    prompt: str,
    model: str,
    size: str,
    quality: str,
    n: int,
    api_key: str,
) -> list[bytes]:
    """Call images.generate and return a list of PNG bytes (one per image)."""
    client = AsyncOpenAI(api_key=api_key)
    try:
        response = await client.images.generate(
            model=model,
            prompt=prompt,
            n=n,
            size=size,  # type: ignore[arg-type]
            quality=quality,  # type: ignore[arg-type]
            response_format="b64_json",
        )
    except APIStatusError as exc:
        msg = exc.message or str(exc)
        raise HTTPException(status_code=502, detail=msg) from exc

    result: list[bytes] = []
    for item in response.data:
        if item.b64_json:
            result.append(base64.b64decode(item.b64_json))
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
    client = AsyncOpenAI(api_key=api_key)

    image_file = ("image.png", io.BytesIO(image_bytes), "image/png")
    mask_file = ("mask.png", io.BytesIO(mask_bytes), "image/png") if mask_bytes else None

    try:
        kwargs: dict = dict(
            model=model,
            image=image_file,
            prompt=prompt,
            n=1,
            size=size,  # type: ignore[arg-type]
            response_format="b64_json",
        )
        if mask_file is not None:
            kwargs["mask"] = mask_file

        response = await client.images.edit(**kwargs)
    except APIStatusError as exc:
        msg = exc.message or str(exc)
        raise HTTPException(status_code=502, detail=msg) from exc

    items = response.data
    if not items or not items[0].b64_json:
        raise HTTPException(status_code=502, detail="OpenAI returned no image data")

    return base64.b64decode(items[0].b64_json)
