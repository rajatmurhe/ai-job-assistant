"""
ai/parsers/text_cleaner.py

Normalizes whitespace and strips common PDF/DOCX extraction artifacts
(form-feed characters, repeated blank lines, stray bullet glyphs,
hyphenation line-breaks) before text goes to the LLM extractor.
"""
from __future__ import annotations

import re


def clean_text(raw: str) -> str:
    if not raw:
        return ""

    text = raw.replace("\x0c", "\n")  # form feed -> newline
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # De-hyphenate words split across a line break: "develop-\nment" -> "development"
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)

    # Normalize common bullet glyphs to a plain dash
    text = re.sub(r"[•▪◦●‣∙]", "-", text)

    # Collapse runs of spaces/tabs
    text = re.sub(r"[ \t]+", " ", text)

    # Collapse 3+ blank lines to a single blank line
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Strip trailing whitespace per line
    text = "\n".join(line.strip() for line in text.split("\n"))

    return text.strip()
