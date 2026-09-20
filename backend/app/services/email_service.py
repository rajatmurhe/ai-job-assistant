"""
app/services/email_service.py

Sends the generated application email via Gmail API (production) or
SMTP to Mailhog (local dev, GMAIL_ENABLED=false). The Gmail OAuth flow
itself (credentials.json/token.json) is out of scope for this pass —
send_via_gmail raises ConfigurationError until real Gmail credentials
are wired up in Module 12; send_via_smtp (Mailhog) is fully functional
now since it needs no external credentials.
"""
from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import get_settings
from app.core.exceptions import ConfigurationError
from app.core.logging import get_logger, mask_email

logger = get_logger(__name__)


def _build_message(to_email: str, from_email: str, subject: str, body: str) -> MIMEMultipart:
    msg = MIMEMultipart()
    msg["From"] = from_email
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))
    return msg


def send_via_smtp(to_email: str, subject: str, body: str) -> None:
    """Sends via Mailhog (dev SMTP catcher) — no real email leaves the machine."""
    settings = get_settings()
    from_email = settings.gmail_sender_email or "noreply@ai-job-assistant.local"
    msg = _build_message(to_email, from_email, subject, body)

    with smtplib.SMTP(settings.mailhog_smtp_host, settings.mailhog_smtp_port) as smtp:
        smtp.send_message(msg)

    logger.info("email.sent", backend="smtp_mailhog", to=mask_email(to_email))


async def send_via_gmail(to_email: str, subject: str, body: str) -> None:
    """
    Production path using the Gmail API. Requires GMAIL_CREDENTIALS_PATH
    / GMAIL_TOKEN_PATH to point at real OAuth credentials generated via
    Google Cloud Console (see docs/troubleshooting.md once written in
    Module 12) — not present in this build environment, so this raises
    until configured for real use.
    """
    settings = get_settings()
    if not settings.gmail_enabled:
        raise ConfigurationError("GMAIL_ENABLED is false; set it true and configure OAuth credentials to send via Gmail.")

    import os

    if not os.path.exists(settings.gmail_credentials_path):
        raise ConfigurationError(
            f"Gmail credentials not found at {settings.gmail_credentials_path}.",
            details={"path": settings.gmail_credentials_path},
        )

    # Actual googleapiclient send call — implemented against the documented
    # Gmail API contract; not exercised live in this build environment
    # (no OAuth credentials present here).
    import base64

    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    creds = Credentials.from_authorized_user_file(settings.gmail_token_path)
    service = build("gmail", "v1", credentials=creds)

    msg = _build_message(to_email, settings.gmail_sender_email or "", subject, body)
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    service.users().messages().send(userId="me", body={"raw": raw}).execute()

    logger.info("email.sent", backend="gmail_api", to=mask_email(to_email))


async def send_application_email(to_email: str, subject: str, body: str) -> None:
    settings = get_settings()
    if settings.gmail_enabled:
        await send_via_gmail(to_email, subject, body)
    else:
        send_via_smtp(to_email, subject, body)
