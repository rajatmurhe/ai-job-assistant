"""app/schemas/application.py — API request/response shapes for the application tracker (FSM, section 17)."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class ApplicationCreate(BaseModel):
    resume_id: uuid.UUID
    job_id: uuid.UUID
    notes: str | None = None


class ApplicationStatusUpdate(BaseModel):
    status: str
    note: str | None = None


class ApplicationEventResponse(BaseModel):
    from_status: str | None
    to_status: str
    note: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApplicationResponse(BaseModel):
    id: uuid.UUID
    resume_id: uuid.UUID
    job_id: uuid.UUID
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
