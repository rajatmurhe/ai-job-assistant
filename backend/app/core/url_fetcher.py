"""
backend/app/core/url_fetcher.py

Asynchronously fetches job posting web pages and strips HTML noise.
Features:
- Browser-like User-Agent and headers to prevent aggressive bot blocks.
- Structured data extraction: checks for JSON-LD JobPosting schema (used by LinkedIn,
  Indeed, Glassdoor, Lever, Greenhouse, Workday) and formats it if found.
- Robust HTML clean-up removing nav, footer, script, style, and svg tags.
"""
from __future__ import annotations

import html
import json
import re
from urllib.parse import urlparse

import httpx

from app.core.exceptions import ValidationFailedError
from app.core.logging import get_logger

logger = get_logger(__name__)

_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}


def _try_extract_json_ld(html_content: str) -> str | None:
    """Extract schema.org/JobPosting JSON-LD if present on the page."""
    script_pattern = re.compile(
        r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        re.DOTALL | re.IGNORECASE,
    )
    for match in script_pattern.finditer(html_content):
        raw_json = match.group(1).strip()
        try:
            data = json.loads(raw_json)
            # Could be a single dict or list of dicts, or @graph
            items = []
            if isinstance(data, list):
                items = data
            elif isinstance(data, dict):
                if "@graph" in data and isinstance(data["@graph"], list):
                    items = data["@graph"]
                else:
                    items = [data]

            for item in items:
                if isinstance(item, dict) and item.get("@type") in ("JobPosting", "http://schema.org/JobPosting"):
                    title = item.get("title", "")
                    hiring_org = item.get("hiringOrganization", {})
                    company = hiring_org.get("name", "") if isinstance(hiring_org, dict) else str(hiring_org)
                    desc = item.get("description", "")
                    emp_type = item.get("employmentType", "")
                    loc = item.get("jobLocation", {})
                    loc_str = ""
                    if isinstance(loc, dict):
                        addr = loc.get("address", {})
                        if isinstance(addr, dict):
                            loc_str = f"{addr.get('addressLocality', '')} {addr.get('addressRegion', '')}".strip()

                    clean_desc = re.sub(r"<[^>]+>", " ", desc)
                    clean_desc = html.unescape(clean_desc)
                    clean_desc = re.sub(r"\s+", " ", clean_desc).strip()

                    formatted = (
                        f"Job Title: {title}\n"
                        f"Company: {company}\n"
                        f"Location: {loc_str}\n"
                        f"Employment Type: {emp_type}\n\n"
                        f"Job Description:\n{clean_desc}"
                    )
                    logger.info("url_fetcher.json_ld_detected", title=title, company=company)
                    return formatted
        except Exception:
            continue
    return None


def clean_html_to_text(html_content: str) -> str:
    """Strip scripts, styles, forms, headers, footers, navs, and tags to plain text."""
    # Check for JSON-LD JobPosting first
    json_ld_result = _try_extract_json_ld(html_content)
    if json_ld_result and len(json_ld_result) > 100:
        return json_ld_result

    # Remove irrelevant blocks
    text = re.sub(
        r"<(script|style|nav|footer|header|noscript|svg|iframe)[^>]*>.*?</\1>",
        " ",
        html_content,
        flags=re.DOTALL | re.IGNORECASE,
    )
    # Strip HTML tags
    text = re.sub(r"<[^>]+>", " ", text)
    # Decode HTML entities
    text = html.unescape(text)
    # Normalize whitespaces
    lines = [line.strip() for line in text.splitlines()]
    clean_lines = [l for l in lines if l]
    cleaned = "\n".join(clean_lines)
    return cleaned


async def fetch_job_url(url: str, timeout: float = 25.0) -> str:
    """Fetch URL and return clean text representation of the job posting."""
    parsed = urlparse(url)
    if not parsed.scheme or parsed.scheme not in ("http", "https"):
        raise ValidationFailedError(f"Invalid URL scheme. Must start with http:// or https://: {url}")

    try:
        async with httpx.AsyncClient(
            headers=_DEFAULT_HEADERS,
            follow_redirects=True,
            timeout=timeout,
            verify=False,  # Avoid corporate cert inspection issues
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html_text = resp.text
    except httpx.HTTPStatusError as e:
        logger.error("url_fetcher.http_error", status_code=e.response.status_code, url=url)
        raise ValidationFailedError(f"Could not load job URL: HTTP {e.response.status_code}")
    except httpx.RequestError as e:
        logger.error("url_fetcher.network_error", error=str(e), url=url)
        raise ValidationFailedError(f"Network error fetching job URL: {str(e)}")

    cleaned = clean_html_to_text(html_text)
    if len(cleaned) < 50:
        raise ValidationFailedError(
            "Extracted job text is too brief or empty. The website may require login or JavaScript rendering. "
            "Please copy and paste the job description text directly."
        )

    return cleaned
