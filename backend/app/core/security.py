"""
app/core/security.py

File validation helpers used by the resume upload endpoint before the
file bytes are ever handed to ai/parsers/resume_parser.py. Checks the
declared filename extension AND the actual file magic bytes, since a
renamed .exe with a .pdf extension should never reach the parser.
"""
from __future__ import annotations

from app.core.exceptions import UnsupportedFileTypeError

_MAGIC_BYTES: dict[str, bytes] = {
    "pdf": b"%PDF-",
    "docx": b"PK\x03\x04",  # docx is a zip archive
}

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}


def validate_file_extension(filename: str) -> str:
    if "." not in filename:
        raise UnsupportedFileTypeError(f"File has no extension: {filename}")
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise UnsupportedFileTypeError(
            f"Unsupported file extension: .{ext}. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
            details={"filename": filename},
        )
    return ext


def validate_magic_bytes(file_bytes: bytes, expected_ext: str) -> None:
    """
    .txt has no reliable magic bytes, so it's exempt. pdf/docx are
    checked against their known file-format signatures.
    """
    if expected_ext == "txt":
        return
    signature = _MAGIC_BYTES.get(expected_ext)
    if signature and not file_bytes.startswith(signature):
        raise UnsupportedFileTypeError(
            f"File content does not match its .{expected_ext} extension (magic byte mismatch).",
            details={"expected_signature": signature.hex()},
        )
