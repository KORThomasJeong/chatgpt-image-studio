import logging
import os
import subprocess
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import AsyncSessionLocal

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s  %(message)s",
    stream=sys.stdout,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: run migrations and seed the database on startup."""
    # ------------------------------------------------------------------
    # 1. Run Alembic migrations
    # ------------------------------------------------------------------
    logger.info("Running Alembic migrations…")
    try:
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True,
            text=True,
            check=True,
        )
        if result.stdout:
            logger.info("Alembic stdout: %s", result.stdout.strip())
        if result.stderr:
            logger.info("Alembic stderr: %s", result.stderr.strip())
        logger.info("Alembic migrations complete.")
    except subprocess.CalledProcessError as exc:
        logger.error(
            "Alembic migration failed (exit %s):\nstdout: %s\nstderr: %s",
            exc.returncode,
            exc.stdout,
            exc.stderr,
        )
        raise RuntimeError("Database migration failed") from exc

    # ------------------------------------------------------------------
    # 2. Seed admin user and create data directories
    # ------------------------------------------------------------------
    from app.seed import seed_admin  # noqa: PLC0415

    async with AsyncSessionLocal() as session:
        await seed_admin(session)
        await session.commit()

    # ------------------------------------------------------------------
    # 3. Ensure data directories exist (belt-and-suspenders)
    # ------------------------------------------------------------------
    for sub in ("images", "uploads"):
        path = os.path.join(settings.DATA_DIR, sub)
        os.makedirs(path, exist_ok=True)

    logger.info("Startup complete. ChatGPT Image Studio is ready.")
    yield
    # Nothing to clean up on shutdown.


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="ChatGPT Image Studio",
    version="0.1.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

# CORS — allow all origins during development; tighten in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

from app.routers.auth import router as auth_router  # noqa: E402

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])

# The three routers below are implemented by Agent B.
# They are imported lazily so that missing files during development produce
# a clear ImportError rather than a cryptic startup crash.
try:
    from app.routers.images import images_router  # type: ignore[import]
    app.include_router(images_router, prefix="/api/images", tags=["images"])
except ImportError:
    logger.warning("app.routers.images not found — /api/images endpoints unavailable.")

try:
    from app.routers.users import users_router  # type: ignore[import]
    app.include_router(users_router, prefix="/api/admin/users", tags=["users"])
except ImportError:
    logger.warning("app.routers.users not found — /api/users endpoints unavailable.")

try:
    from app.routers.settings import settings_router  # type: ignore[import]
    app.include_router(settings_router, prefix="/api/settings", tags=["settings"])
except ImportError:
    logger.warning("app.routers.settings not found — /api/settings endpoints unavailable.")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/api/health", tags=["health"])
async def health_check():
    return {"status": "ok"}


@app.get("/api/config", tags=["config"])
async def get_config():
    return {"default_model": settings.DEFAULT_IMAGE_MODEL}
