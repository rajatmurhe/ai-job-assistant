"""app/models/application.py — applications + application_events (FSM, section 17)."""
from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDPKMixin, UUID_TYPE

# Valid FSM states and transitions (mirrored in app/services/tracking_service.py).
APPLICATION_STATUSES = [
    "DRAFT", "READY", "APPLIED", "IN_REVIEW", "INTERVIEWING",
    "OFFER", "REJECTED", "WITHDRAWN",
]


class Application(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "applications"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID_TYPE, ForeignKey("users.id"), index=True)
    resume_id: Mapped[uuid.UUID] = mapped_column(UUID_TYPE, ForeignKey("resumes.id"))
    job_id: Mapped[uuid.UUID] = mapped_column(UUID_TYPE, ForeignKey("jobs.id"))
    status: Mapped[str] = mapped_column(String(20), default="DRAFT")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship(back_populates="applications")  # noqa: F821
    events: Mapped[list["ApplicationEvent"]] = relationship(back_populates="application", cascade="all, delete-orphan")


class ApplicationEvent(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "application_events"

    application_id: Mapped[uuid.UUID] = mapped_column(UUID_TYPE, ForeignKey("applications.id"), index=True)
    from_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    to_status: Mapped[str] = mapped_column(String(20))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    application: Mapped["Application"] = relationship(back_populates="events")

