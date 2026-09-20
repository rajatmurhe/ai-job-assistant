"""
ai/validation/validator.py

Validates every LLM response against a JSON Schema before it is allowed
anywhere near the database or the user. Golden Rule 2: never trust LLM
output blindly.

Flow: parse JSON -> jsonschema validate -> on failure, attempt one
"repair" pass (strip common LLM formatting mistakes) -> re-validate ->
on repeated failure, raise ValidationFailedError. The caller (an
extractor/generator using an LLMProvider) is responsible for the
retry-the-whole-LLM-call loop (see ai/providers/base.py); this module
only validates a single response.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

from app.core.exceptions import ValidationFailedError
from app.core.logging import get_logger

logger = get_logger(__name__)

SCHEMA_DIR = Path(__file__).parent / "schemas"

_SCHEMA_CACHE: dict[str, dict] = {}


def _load_schema(schema_name: str) -> dict:
    if schema_name not in _SCHEMA_CACHE:
        path = SCHEMA_DIR / f"{schema_name}.json"
        if not path.exists():
            raise ValidationFailedError(
                f"Unknown validation schema: {schema_name}",
                details={"schema": schema_name, "searched_path": str(path)},
            )
        with open(path) as f:
            _SCHEMA_CACHE[schema_name] = json.load(f)
    return _SCHEMA_CACHE[schema_name]


def _strip_markdown_fences(text: str) -> str:
    """Repair pass: LLMs sometimes wrap JSON in ```json ... ``` fences."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _extract_first_json_object(text: str) -> str | None:
    """Repair pass: LLM added preamble/postamble text around the JSON."""
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    return text[start : end + 1]


def parse_and_validate(raw_output: str, schema_name: str) -> dict[str, Any]:
    """
    Parse `raw_output` as JSON and validate it against `schema_name`.
    Raises ValidationFailedError if parsing/validation fails even after
    the repair pass. Never returns partially-valid or default data
    (Golden Rule 9: fail loudly).
    """
    schema = _load_schema(schema_name)
    validator = Draft202012Validator(schema)

    candidate = raw_output
    data: dict[str, Any] | None = None
    parse_error: str | None = None

    for attempt_text in (candidate, _strip_markdown_fences(candidate)):
        try:
            data = json.loads(attempt_text)
            break
        except json.JSONDecodeError as e:
            parse_error = str(e)
            continue

    if data is None:
        extracted = _extract_first_json_object(_strip_markdown_fences(candidate))
        if extracted:
            try:
                data = json.loads(extracted)
                logger.info("llm.validation.repaired", schema=schema_name, changes_made=["extracted_json_object"])
            except json.JSONDecodeError as e:
                parse_error = str(e)

    if data is None:
        logger.error("llm.validation.failed", schema=schema_name, errors=[parse_error or "unparseable"])
        raise ValidationFailedError(
            f"LLM output for schema '{schema_name}' was not valid JSON.",
            details={"schema": schema_name, "parse_error": parse_error},
        )

    # Automatic repair pass for minor LLM enum casing differences
    if isinstance(data, dict):
        # ── job_data repairs ──────────────────────────────────────────────
        if "seniority" in data and isinstance(data["seniority"], str):
            s_val = data["seniority"].strip().lower()
            data["seniority"] = s_val if s_val in ["junior", "mid", "senior", "staff", "lead"] else None
        if "work_arrangement" in data and isinstance(data["work_arrangement"], str):
            w_val = data["work_arrangement"].strip().lower()
            data["work_arrangement"] = w_val if w_val in ["remote", "hybrid", "onsite"] else None
        if "requirements" in data and isinstance(data["requirements"], list):
            for req in data["requirements"]:
                if isinstance(req, dict):
                    if "requirement_type" in req and isinstance(req["requirement_type"], str):
                        req["requirement_type"] = req["requirement_type"].strip().lower()
                    if "importance" in req and isinstance(req["importance"], str):
                        imp = req["importance"].strip().upper().replace(" ", "_")
                        req["importance"] = imp if imp in ["MANDATORY", "PREFERRED", "NICE_TO_HAVE"] else "MANDATORY"
        if "skills" in data and isinstance(data["skills"], list):
            for sk in data["skills"]:
                if isinstance(sk, dict):
                    # job_data skill importance
                    if "importance" in sk and isinstance(sk["importance"], str):
                        imp = sk["importance"].strip().upper().replace(" ", "_")
                        sk["importance"] = imp if imp in ["MANDATORY", "PREFERRED", "NICE_TO_HAVE"] else "MANDATORY"
                    # resume_data skill category — map LLM verbose categories to schema enums
                    if "category" in sk and isinstance(sk["category"], str):
                        raw = sk["category"].strip().lower()
                        _CATEGORY_MAP = {
                            "language": "language", "languages": "language", "programming language": "language",
                            "framework": "framework", "frameworks": "framework", "library": "framework",
                            "libraries": "framework",
                            "tool": "tool", "tools": "tool", "devops": "tool", "database": "tool",
                            "databases": "tool", "cloud": "tool", "platform": "tool", "platforms": "tool",
                            "soft": "soft", "soft skill": "soft", "soft skills": "soft",
                            "methodology": "soft", "methodologies": "soft",
                            "domain": "domain", "ai/ml": "domain", "ai": "domain", "ml": "domain",
                            "machine learning": "domain", "artificial intelligence": "domain",
                        }
                        sk["category"] = _CATEGORY_MAP.get(raw, None)
                    # resume_data skill proficiency
                    if "proficiency" in sk and isinstance(sk["proficiency"], str):
                        prof = sk["proficiency"].strip().lower()
                        sk["proficiency"] = prof if prof in ["expert", "intermediate", "beginner"] else None

    errors = sorted(validator.iter_errors(data), key=lambda e: e.path)
    if errors:
        error_msgs = [f"{'.'.join(str(p) for p in e.path) or '<root>'}: {e.message}" for e in errors]
        logger.error("llm.validation.failed", schema=schema_name, errors=error_msgs)
        raise ValidationFailedError(
            f"LLM output for schema '{schema_name}' failed schema validation.",
            details={"schema": schema_name, "errors": error_msgs},
        )

    return data
