"""app/models/analysis.py — analysis_reports table."""
from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, JSONB_TYPE, TimestampMixin, UUIDPKMixin, UUID_TYPE


class AnalysisReport(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "analysis_reports"

    resume_id: Mapped[uuid.UUID] = mapped_column(UUID_TYPE, ForeignKey("resumes.id"), index=True)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID_TYPE, ForeignKey("jobs.id"), index=True)
    overall_score: Mapped[float] = mapped_column(Numeric(5, 2))
    recommendation: Mapped[str] = mapped_column(String(30))
    sub_scores: Mapped[dict] = mapped_column(JSONB_TYPE)          # matches match_result.json sub_scores
    gap_analysis: Mapped[dict] = mapped_column(JSONB_TYPE)        # strong/partial/missing/transferable
    ats_analysis: Mapped[dict] = mapped_column(JSONB_TYPE)        # ats_score/keywords/formatting_issues
    report_markdown: Mapped[str | None] = mapped_column(nullable=True)

