"""app/models/user.py — users table."""
from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDPKMixin


class User(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    resumes: Mapped[list["Resume"]] = relationship(back_populates="user")  # noqa: F821
    applications: Mapped[list["Application"]] = relationship(back_populates="user")  # noqa: F821
