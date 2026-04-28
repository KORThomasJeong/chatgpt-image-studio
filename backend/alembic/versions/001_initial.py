"""Initial schema: users and images tables

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- users table ---
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("username", sa.String(100), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("openai_api_key_encrypted", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)

    # --- images table ---
    op.create_table(
        "images",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            default=uuid.uuid4,
        ),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("model", sa.String(50), nullable=False, server_default=sa.text("'gpt-image-1'")),
        sa.Column("size", sa.String(20), nullable=False, server_default=sa.text("'1024x1024'")),
        sa.Column("quality", sa.String(20), nullable=False, server_default=sa.text("'standard'")),
        sa.Column("file_path", sa.String(500), nullable=True),
        sa.Column("source_image_path", sa.String(500), nullable=True),
        sa.Column("mask_path", sa.String(500), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_images_user_id"), "images", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_images_user_id"), table_name="images")
    op.drop_table("images")
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_table("users")
