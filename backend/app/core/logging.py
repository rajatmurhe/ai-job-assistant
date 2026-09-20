"""
Structured JSON logging setup (structlog).

Never logs raw resume content, full email addresses, or secrets —
see section 22 (Security & Privacy Rules) of the master documentation.
"""
import logging
import sys

import structlog

from app.core.config import get_settings


def mask_email(email: str | None) -> str | None:
    """Mask an email to first 3 chars + *** for safe logging."""
    if not email or "@" not in email:
        return email
    local, _, domain = email.partition("@")
    visible = local[:3]
    return f"{visible}***@{domain}"


def configure_logging() -> None:
    settings = get_settings()
    level = getattr(logging, settings.log_level, logging.INFO)

    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=level,
    )

    shared_processors: list = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if settings.log_format == "json":
        renderer = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer()

    structlog.configure(
        processors=shared_processors + [renderer],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str):
    return structlog.get_logger(name)
