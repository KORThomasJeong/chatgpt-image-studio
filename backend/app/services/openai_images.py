"""
OpenAI Images Service — raw HTTP via httpx, no SDK.
"""

import base64

import httpx
from fastapi import HTTPException

_TIMEOUT = 120.0
_GENERATIONS_URL = "https://api.openai.com/v1/images/generations"
_EDITS_URL = "https://api.openai.com/v1/images/edits"


def _parse_openai_error(body: dict) -> str:
    """Extract a human-readable message from an OpenAI error response."""
    try:
        return body["error"]["message"]
    except (KeyError, TypeError):
        return "Unknown OpenAI error"


async def generate_image(
    prompt: str,
    model: str,
    size: str,
    quality: str,
    n: int,
    api_key: str,
) -> list[bytes]:
    """
    Call the OpenAI generations endpoint and return a list of PNG bytes
    (one per requested image).
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "prompt": prompt,
        "n": n,
        "size": size,
        "quality": quality,
        "response_format": "b64_json",
    }

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.post(_GENERATIONS_URL, headers=headers, json=payload)

    if response.status_code != 200:
        error_msg = _parse_openai_error(response.json())
        raise HTTPException(status_code=502, detail=error_msg)

    data = response.json().get("data", [])
    result: list[bytes] = []
    for item in data:
        b64 = item.get("b64_json", "")
        result.append(base64.b64decode(b64))
    return result


async def edit_image(
    prompt: str,
    image_bytes: bytes,
    mask_bytes: bytes | None,
    model: str,
    size: str,
    api_key: str,
) -> bytes:
    """
    Call the OpenAI image-edits endpoint (multipart) and return PNG bytes.
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
    }

    # Build multipart fields
    files: list[tuple] = [
        ("image", ("image.png", image_bytes, "image/png")),
    ]
    if mask_bytes is not None:
        files.append(("mask", ("mask.png", mask_bytes, "image/png")))

    data = {
        "model": model,
        "prompt": prompt,
        "n": "1",
        "size": size,
        "response_format": "b64_json",
    }

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.post(
            _EDITS_URL,
            headers=headers,
            data=data,
            files=files,
        )

    if response.status_code != 200:
        error_msg = _parse_openai_error(response.json())
        raise HTTPException(status_code=502, detail=error_msg)

    items = response.json().get("data", [])
    if not items:
        raise HTTPException(status_code=502, detail="OpenAI returned no image data")

    b64 = items[0].get("b64_json", "")
    return base64.b64decode(b64)
