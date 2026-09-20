"""app/models/job.py — jobs + job_requirements."""
from __future__ import annotations

import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, JSONB_TYPE, TimestampMixin, UUIDPKMixin, UUID_TYPE, VECTOR_TYPE


class Job(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "jobs"

    title: Mapped[str] = mapped_column(String(255))
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    raw_text: Mapped[str] = mapped_column(Text)
    parsed_data: Mapped[dict] = mapped_column(JSONB_TYPE)  # validated JobData JSON
    embedding: Mapped[list[float] | None] = mapped_column(VECTOR_TYPE, nullable=True)

    requirements: Mapped[list["JobRequirement"]] = relationship(back_populates="job", cascade="all, delete-orphan")


class JobRequirement(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "job_requirements"

    job_id: Mapped[uuid.UUID] = mapped_column(UUID_TYPE, ForeignKey("jobs.id"), index=True)
    requirement_type: Mapped[str] = mapped_column(String(50))  # skill | education | experience | certification
    value: Mapped[str] = mapped_column(String(500))
    importance: Mapped[str] = mapped_column(String(20))  # MANDATORY | PREFERRED | NICE_TO_HAVE

    job: Mapped["Job"] = relationship(back_populates="requirements")

