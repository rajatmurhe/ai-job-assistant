"""app/schemas/generation.py — API request/response shapes for document generation."""
from __future__ import annotations

import uuid

from pydantic import BaseModel


class GenerateRequest(BaseModel):
    resume_id: uuid.UUID
    job_id: uuid.UUID
    application_id: uuid.UUID | None = None


class EmailContent(BaseModel):
    subject: str
    body: str


class GeneratedDocumentsResponse(BaseModel):
    resume_markdown: str | None = None
    cover_letter: str | None = None
    application_email: EmailContent | None = None
    changes_made: list[str] = []
    truthfulness_check_passed: bool
