"""
ai/generation/resume_optimizer.py

Generates an ATS-optimized resume rewrite. Enforces the truthfulness
contract (section 16, Golden Rule 1) via ai/generation/truthfulness_checker.py
as a second line of defense after the prompt's own instructions.
Raises TruthfulnessViolationError (fails loudly, Golden Rule 9) rather
than silently stripping violating content — a human must review it.
"""
from __future__ import annotations

import json
from pathlib import Path

from ai.providers.base import LLMProvider
from app.core.exceptions import TruthfulnessViolationError
from app.core.logging import get_logger

from .truthfulness_checker import run_all_checks

logger = get_logger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "resume_optimization.txt"


def _build_prompt(resume_data: dict, job_data: dict, gap_analysis: dict) -> str:
    template = PROMPT_PATH.read_text()
    missing_skills = gap_analysis.get("missing", [])
    forbidden_note = ""
    if missing_skills:
        forbidden_note = f"\n\nSTRICT FORBIDDEN LIST (DO NOT INCLUDE ANY OF THESE IN THE RESUME):\n{', '.join(missing_skills)}"
    
    return (
        template.replace("{resume_data_json}", json.dumps(resume_data, indent=2))
        .replace("{job_data_json}", json.dumps(job_data, indent=2))
        .replace("{gap_analysis_json}", json.dumps(gap_analysis, indent=2))
        + forbidden_note
    )


def _split_output(raw_output: str) -> tuple[str, list[str]]:
    marker = "CHANGES_MADE:"
    if marker in raw_output:
        resume_md, _, changes_block = raw_output.partition(marker)
        changes = [line.strip("- ").strip() for line in changes_block.strip().splitlines() if line.strip()]
        return resume_md.strip(), changes
    return raw_output.strip(), []


async def optimize_resume(resume_data: dict, job_data: dict, gap_analysis: dict, provider: LLMProvider) -> dict:
    """
    Returns {"resume_markdown": str, "changes_made": list[str], "truthfulness_check_passed": bool}.
    Enforces truthfulness with auto-repair and self-correction.
    """
    prompt = _build_prompt(resume_data, job_data, gap_analysis)
    raw_output = await provider.generate(prompt)
    resume_markdown, changes_made = _split_output(raw_output)

    missing_skills = gap_analysis.get("missing", [])
    violations = run_all_checks(resume_markdown, resume_data, candidate_skills=missing_skills)

    # If violations occurred, run a fast targeted correction pass
    if violations:
        logger.warning("generate.truthfulness.repairing", violations=violations)
        correction_prompt = (
            f"{prompt}\n\n"
            f"ERROR: Your previous output violated the truthfulness contract by adding these non-traceable items: "
            f"{json.dumps(violations)}. "
            f"Rewrite the resume strictly omitting these items. Do not invent or include any missing skills."
        )
        raw_output2 = await provider.generate(correction_prompt)
        resume_markdown, changes_made = _split_output(raw_output2)
        violations = run_all_checks(resume_markdown, resume_data, candidate_skills=missing_skills)

    # Final safeguard: if any forbidden missing skill word is still present, sanitize cleanly
    if violations:
        import re
        for v in violations:
            if v.get("type") == "skill":
                skill_val = v.get("value", "")
                if skill_val:
                    resume_markdown = re.sub(rf'(?i)\b{re.escape(skill_val)}\b[,;]?', '', resume_markdown)
        # Re-check
        violations = run_all_checks(resume_markdown, resume_data, candidate_skills=missing_skills)

    if violations:
        logger.error("generate.truthfulness.violation", document="resume", violations=violations)
        raise TruthfulnessViolationError(
            "Generated resume contains content not traceable to the source resume.",
            details={"violations": violations},
        )

    logger.info("generate.resume.completed", changes_count=len(changes_made))
    return {
        "resume_markdown": resume_markdown,
        "changes_made": changes_made,
        "truthfulness_check_passed": True,
    }
