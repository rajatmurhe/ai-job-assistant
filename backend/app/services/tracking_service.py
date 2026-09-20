"""
app/services/tracking_service.py

Application CRUD + FSM status transitions + event log (section 17).

The FSM is intentionally simple and linear-with-branches:

    DRAFT -> READY -> APPLIED -> IN_REVIEW -> INTERVIEWING -> OFFER
                          |            |             |
                          v            v             v
                      WITHDRAWN   REJECTED       REJECTED
                                                      |
                                                      v
                                                 WITHDRAWN (from any active state)

Every transition is logged as an ApplicationEvent (from_status,
to_status, note) — never overwritten, so the full history survives
even if `status` itself changes many times (Golden Rule 9: nothing
silently lost).
"""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import InvalidStatusTransitionError, NotFoundError
from app.core.logging import get_logger
from app.models.application import Application, ApplicationEvent

logger = get_logger(__name__)

VALID_TRANSITIONS: dict[str, set[str]] = {
    "DRAFT": {"READY", "WITHDRAWN"},
    "READY": {"APPLIED", "WITHDRAWN"},
    "APPLIED": {"IN_REVIEW", "REJECTED", "WITHDRAWN"},
    "IN_REVIEW": {"INTERVIEWING", "REJECTED", "WITHDRAWN"},
    "INTERVIEWING": {"OFFER", "REJECTED", "WITHDRAWN"},
    "OFFER": {"WITHDRAWN"},  # accepting an offer ends tracking; rejecting is also terminal
    "REJECTED": set(),       # terminal
    "WITHDRAWN": set(),      # terminal
}


def validate_transition(current_status: str, new_status: str) -> None:
    allowed = VALID_TRANSITIONS.get(current_status, set())
    if new_status not in allowed:
        raise InvalidStatusTransitionError(
            f"Cannot transition application from {current_status} to {new_status}.",
            details={"current_status": current_status, "requested_status": new_status, "allowed": sorted(allowed)},
        )


async def create_application(db: AsyncSession, *, user_id: uuid.UUID, resume_id: uuid.UUID, job_id: uuid.UUID, notes: str | None = None) -> Application:
    application = Application(user_id=user_id, resume_id=resume_id, job_id=job_id, status="DRAFT", notes=notes)
    db.add(application)
    await db.flush()
    db.add(ApplicationEvent(application_id=application.id, from_status=None, to_status="DRAFT", note="Application created."))
    await db.commit()
    await db.refresh(application)
    logger.info("application.created", application_id=str(application.id))
    return application


async def get_application(db: AsyncSession, application_id: uuid.UUID) -> Application:
    result = await db.execute(select(Application).where(Application.id == application_id))
    application = result.scalar_one_or_none()
    if application is None:
        raise NotFoundError(f"Application {application_id} not found.")
    return application


async def transition_status(db: AsyncSession, application_id: uuid.UUID, new_status: str, note: str | None = None) -> Application:
    application = await get_application(db, application_id)
    validate_transition(application.status, new_status)

    event = ApplicationEvent(
        application_id=application.id,
        from_status=application.status,
        to_status=new_status,
        note=note,
    )
    application.status = new_status
    db.add(event)
    await db.commit()
    await db.refresh(application)

    logger.info("application.status_changed", application_id=str(application.id), to_status=new_status)
    return application


async def list_applications(db: AsyncSession, user_id: uuid.UUID) -> list[Application]:
    result = await db.execute(select(Application).where(Application.user_id == user_id).order_by(Application.updated_at.desc()))
    return list(result.scalars().all())
