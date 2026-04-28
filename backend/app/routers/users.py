"""
Users router — admin-only CRUD for user accounts.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import User
from app.security import hash_password, require_admin

users_router = APIRouter(tags=["users"])

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class CreateUserRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8)
    is_admin: bool = False


class UserListItem(BaseModel):
    id: int
    username: str
    is_admin: bool
    has_custom_key: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _user_item(user: User) -> UserListItem:
    return UserListItem(
        id=user.id,
        username=user.username,
        is_admin=user.is_admin,
        has_custom_key=bool(user.openai_api_key_encrypted),
        created_at=user.created_at,
    )


# ---------------------------------------------------------------------------
# GET /  — list all users
# ---------------------------------------------------------------------------


@users_router.get("/", response_model=list[UserListItem])
async def list_users(
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> list[UserListItem]:
    result = await session.execute(select(User).order_by(User.created_at))
    users = result.scalars().all()
    return [_user_item(u) for u in users]


# ---------------------------------------------------------------------------
# POST /  — create a new user
# ---------------------------------------------------------------------------


@users_router.post("/", response_model=UserListItem, status_code=201)
async def create_user(
    body: CreateUserRequest,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> UserListItem:
    # Check for duplicate username
    existing = await session.execute(
        select(User).where(User.username == body.username)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Username already taken")

    new_user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        is_admin=body.is_admin,
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return _user_item(new_user)


# ---------------------------------------------------------------------------
# DELETE /{user_id}  — remove a user
# ---------------------------------------------------------------------------


@users_router.delete("/{user_id}", status_code=204, response_class=Response)
async def delete_user(
    user_id: int,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> None:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent deleting the last admin
    if user.is_admin:
        admin_count_result = await session.execute(
            select(func.count()).select_from(User).where(User.is_admin.is_(True))
        )
        admin_count = admin_count_result.scalar_one()
        if admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete the last admin user",
            )

    await session.delete(user)
    await session.commit()
