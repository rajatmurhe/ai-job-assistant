"""app/models/skill.py — normalized skill taxonomy + resume_skills join."""
from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import ARRAY_TYPE, Base, TimestampMixin, UUIDPKMixin, UUID_TYPE


class Skill(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "skills"

    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)  # language|framework|tool|soft|domain
    aliases: Mapped[list[str]] = mapped_column(ARRAY_TYPE, default=list)


class ResumeSkill(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "resume_skills"

    resume_id: Mapped[uuid.UUID] = mapped_column(UUID_TYPE, ForeignKey("resumes.id"), index=True)
    skill_id: Mapped[uuid.UUID] = mapped_column(UUID_TYPE, ForeignKey("skills.id"), index=True)
    years: Mapped[float | None] = mapped_column(Numeric(4, 1), nullable=True)
    proficiency: Mapped[str | None] = mapped_column(String(20), nullable=True)
    context: Mapped[str | None] = mapped_column(String(500), nullable=True)

