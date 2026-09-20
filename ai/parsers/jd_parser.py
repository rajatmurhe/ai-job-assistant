"""
ai/parsers/jd_parser.py

Accepts a pasted JD string, or fetches+strips a JD from a URL, and
returns cleaned JD text ready for ai/extractors/jd_extractor.py.

URL fetching uses httpx directly with a simple tag-stripping fallback
(BeautifulSoup is not in requirements.txt to keep the dependency list
tight per section 4 preferences for lightweight libraries; a naive
regex strip is sufficient here since only the cleaned text goes to
the LLM extractor, not rendered HTML).
"""
from __future__ import annotations

import re

import httpx

from app.core.exceptions import ValidationFailedError

from .text_cleaner import clean_text

_TAG_RE = re.compile(r"<script.*?</script>|<style.*?</style>|<[^>]+>", re.DOTALL | re.IGNORECASE)


def _strip_html(html: str) -> str:
    text = _TAG_RE.sub(" ", html)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    return text


from app.core.url_fetcher import fetch_job_url


async def parse_jd_from_url(url: str) -> str:
    return await fetch_job_url(url)


def parse_jd_from_text(raw_text: str) -> str:
    cleaned = clean_text(raw_text)
    if not cleaned:
        raise ValidationFailedError("Pasted job description text is empty.")
    return cleaned
