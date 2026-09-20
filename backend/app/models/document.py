"""app/models/document.py — generated_documents table."""
from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import ARRAY_TYPE, Base, TimestampMixin, UUIDPKMixin, UUID_TYPE


class GeneratedDocument(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "generated_documents"

    application_id: Mapped[uuid.UUID] = mapped_column(UUID_TYPE, ForeignKey("applications.id"), index=True)
    document_type: Mapped[str] = mapped_column(String(30))  # resume | cover_letter | email | report
    content: Mapped[str] = mapped_column(Text)
    changes_made: Mapped[list[str]] = mapped_column(ARRAY_TYPE, default=list)
    truthfulness_check_passed: Mapped[bool] = mapped_column(Boolean, default=False)
    approved: Mapped[bool] = mapped_column(Boolean, default=False)

