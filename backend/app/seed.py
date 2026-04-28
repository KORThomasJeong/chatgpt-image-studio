import logging
import os

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.security import hash_password

logger = logging.getLogger(__name__)


async def seed_admin(session: AsyncSession) -> None:
    """Create the default admin user if no admin exists, and ensure data directories exist."""
    # Avoid circular imports — models import from db, so import models here.
    from app.models import User  # noqa: PLC0415

    # ------------------------------------------------------------------
    # Ensure data directories exist
    # ------------------------------------------------------------------
    images_dir = os.path.join(settings.DATA_DIR, "images")
    uploads_dir = os.path.join(settings.DATA_DIR, "uploads")

    for directory in (images_dir, uploads_dir):
        os.makedirs(directory, exist_ok=True)
        logger.info("Ensured directory exists: %s", directory)

    # ------------------------------------------------------------------
    # Create admin user if none exists
    # ------------------------------------------------------------------
    result = await session.execute(select(User).where(User.is_admin.is_(True)).limit(1))
    existing_admin = result.scalar_one_or_none()

    if existing_admin is None:
        admin = User(
            username=settings.ADMIN_USERNAME,
            password_hash=hash_password(settings.ADMIN_PASSWORD),
            is_admin=True,
        )
        session.add(admin)
        await session.flush()
        logger.info(
            "Created default admin user: %r (id=%s)", admin.username, admin.id
        )
    else:
        logger.debug("Admin user already exists: %r", existing_admin.username)
