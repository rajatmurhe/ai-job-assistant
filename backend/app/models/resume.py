"""app/models/resume.py — resumes + resume_versions."""
from __future__ import annotations

import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, JSONB_TYPE, TimestampMixin, UUIDPKMixin, UUID_TYPE, VECTOR_TYPE


class Resume(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "resumes"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID_TYPE, ForeignKey("users.id"), index=True)
    file_name: Mapped[str] = mapped_column(String(255))
    storage_path: Mapped[str] = mapped_column(String(512))
    raw_text: Mapped[str] = mapped_column(Text)
    parsed_data: Mapped[dict] = mapped_column(JSONB_TYPE)  # validated ResumeData JSON
    embedding: Mapped[list[float] | None] = mapped_column(VECTOR_TYPE, nullable=True)
    is_active_version: Mapped[bool] = mapped_column(default=True)

    user: Mapped["User"] = relationship(back_populates="resumes")  # noqa: F821

