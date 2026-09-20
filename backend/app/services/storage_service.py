"""
app/services/storage_service.py

Local filesystem storage backend (STORAGE_BACKEND=local). Not listed
as a separate file in the original module tree, but required by
resume_service to actually persist uploaded files under storage/ —
added here as a small, focused abstraction so a future MinIO backend
(STORAGE_BACKEND=minio) only needs to implement this same interface.
"""
from __future__ import annotations

import uuid
from pathlib import Path

from app.core.config import get_settings


def save_file(file_bytes: bytes, original_filename: str, subfolder: str) -> str:
    """Saves file_bytes under storage/<subfolder>/<uuid>_<original_filename>; returns the relative storage_path."""
    settings = get_settings()
    ext = original_filename.rsplit(".", 1)[-1] if "." in original_filename else "bin"
    safe_name = f"{uuid.uuid4()}.{ext}"

    target_dir = Path(settings.storage_local_path) / subfolder
    target_dir.mkdir(parents=True, exist_ok=True)

    target_path = target_dir / safe_name
    target_path.write_bytes(file_bytes)

    return str(Path(subfolder) / safe_name)


def read_file(storage_path: str) -> bytes:
    settings = get_settings()
    full_path = Path(settings.storage_local_path) / storage_path
    return full_path.read_bytes()
