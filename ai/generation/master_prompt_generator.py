"""
ai/generation/master_prompt_generator.py

Uses the LLM to synthesize a comprehensive, structured "Master Resume Rewrite Prompt"
that the user can paste alongside their resume into any external AI (ChatGPT, Claude, etc.)
to generate a perfect, ATS-optimised, job-targeted new resume.

This module follows the established generation pattern:
  1. Build a rich meta-prompt from all match intelligence data + user rules.
  2. Call the LLM to produce a polished, structured output prompt.
  3. Return the final prompt text ready for the user to copy.
"""
from __future__ import annotations

from ai.providers.base import LLMProvider
from app.core.logging import get_logger

logger = get_logger(__name__)


def _build_synthesis_prompt(
    job_title: str,
    company: str,
    job_data: dict,
    resume_data: dict,
    gap_analysis: dict,
    ats_analysis: dict,
    sub_scores: dict,
    overall_score: float,
    user_rules: str,
) -> str:
    """Build the meta-prompt that instructs the LLM to create the final master prompt."""

    strong = gap_analysis.get("strong", [])
    partial = gap_analysis.get("partial", [])
    transferable = gap_analysis.get("transferable", [])
    missing = gap_analysis.get("missing", [])
    keywords_present = ats_analysis.get("keywords_present", [])
    keywords_missing = ats_analysis.get("keywords_missing", [])

    # Candidate profile summary
    contact = resume_data.get("contact", {})
    name = contact.get("name", "the candidate")
    candidate_skills = [s.get("name", "") for s in resume_data.get("skills", []) if s.get("name")]
    candidate_exp = resume_data.get("experience", [])
    candidate_edu = resume_data.get("education", [])
    candidate_projects = resume_data.get("projects", [])

    # Job required skills
    job_skills = [f"{s['name']} ({s.get('importance','?')})" for s in job_data.get("skills", []) if s.get("name")]
    job_requirements = [r.get("value", "") for r in job_data.get("requirements", []) if r.get("value")]

    user_rules_section = (
        f"\nCANDIDATE'S PERSONAL RESUME RULES (MUST FOLLOW STRICTLY):\n{user_rules.strip()}\n"
        if user_rules.strip()
        else "\n(No personal rules provided by the candidate.)\n"
    )

    # Safe helpers for nullable fields
    def _edu_str(e: dict) -> str:
        deg = (e.get("degree") or "").strip()
        field = (e.get("field") or "").strip()
        inst = (e.get("institution") or "").strip()
        parts = [p for p in [deg, field, inst] if p]
        return " — ".join(parts) if parts else "Unknown"

    def _exp_str(e: dict) -> str:
        title = (e.get("title") or "Unknown Role").strip()
        company = (e.get("company") or "Unknown Company").strip()
        return f"{title} at {company}"

    return f"""You are an elite career strategist, ATS optimization expert, and professional resume writer.

Your task: Generate a MASTER RESUME REWRITE PROMPT — a single comprehensive, perfectly structured prompt that the candidate will paste (together with their current resume text) into ChatGPT, Claude, or any other AI assistant to produce a perfect, ATS-optimized, fully tailored resume for their target role.

---
## INPUT INTELLIGENCE DATA

### TARGET ROLE
- Job Title: {job_title}
- Company: {company}
- Required Skills: {", ".join(job_skills) if job_skills else "Not specified"}
- Key Requirements: {"; ".join(job_requirements) if job_requirements else "Not specified"}
- Job Summary: {(job_data.get("summary") or "Not available")}
- Seniority: {(job_data.get("seniority_level") or "Not specified")}
- Work Arrangement: {(job_data.get("work_arrangement") or "Not specified")}

### CANDIDATE PROFILE: {name}
- Current Skills: {", ".join(candidate_skills) if candidate_skills else "Not listed"}
- Experience Entries: {len(candidate_exp)} roles
- Most Recent Role: {_exp_str(candidate_exp[0]) if candidate_exp else "N/A"}
- Education: {", ".join([_edu_str(e) for e in candidate_edu]) if candidate_edu else "Not listed"}
- Projects: {len(candidate_projects)} projects listed

### MATCH INTELLIGENCE (7-DIMENSION ANALYSIS)
- Overall Compatibility Score: {overall_score}/100
- Required Skills Match: {sub_scores.get("required_skills", 0)}%
- Preferred Skills Match: {sub_scores.get("preferred_skills", 0)}%
- Experience Depth: {sub_scores.get("experience", 0)}%
- Education Level: {sub_scores.get("education", 0)}%
- Project Relevance: {sub_scores.get("projects", 0)}%
- Semantic Fit: {sub_scores.get("semantic", 0)}%
- ATS Keyword Coverage: {sub_scores.get("ats_keywords", 0)}%

### SKILL GAP CLASSIFICATION
✅ STRONG DIRECT MATCHES (emphasize these strongly):
{chr(10).join("- " + s for s in strong) if strong else "- (none)"}

🔄 PARTIAL / TRANSFERABLE (reframe these to bridge the gap):
{chr(10).join("- " + s for s in (partial + transferable)) if (partial + transferable) else "- (none)"}

❌ MISSING REQUIRED SKILLS (do NOT fabricate; suggest honest bridging):
{chr(10).join("- " + s for s in missing) if missing else "- (none — all covered!)"}

### ATS KEYWORD ANALYSIS
✓ Keywords Already in Resume ({len(keywords_present)}):
{", ".join(keywords_present) if keywords_present else "(none detected)"}

✕ Keywords Missing from Resume ({len(keywords_missing)}):
{", ".join(keywords_missing) if keywords_missing else "(none — all covered!)"}

{user_rules_section}

---
## YOUR TASK

Using ALL the intelligence data above, write a MASTER RESUME REWRITE PROMPT.

The master prompt you generate MUST:

1. Instruct the receiving AI to act as an expert resume writer targeting EXACTLY this role and company.
2. Provide explicit, actionable instructions for each section of the resume:
   - Professional Summary: Craft a powerful 3-4 sentence summary tailored to this role, using the strongest matched skills.
   - Work Experience: Rewrite each bullet with impact metrics, naturally embedding detected ATS keywords and strong-match skills.
   - Skills Section: Reorganize to lead with skills that match this job; explain how to bridge transferable skills honestly.
   - Projects: Highlight projects most relevant to the job requirements; suggest reframing angles.
   - Education: Ensure degree/field is optimally positioned for this role's requirements.
3. Include ALL detected ATS keywords (naturally, not forcefully) in placement instructions.
4. Give honest, specific bridging strategies for each MISSING skill (without fabricating).
5. Enforce the candidate's personal rules throughout every instruction.
6. End with a complete output specification: the AI must produce the full resume in a clean, ATS-parseable format.

IMPORTANT RULES FOR THE GENERATED MASTER PROMPT:
- It must be self-contained: when the user appends their resume text and pastes it into any AI, that AI has ALL context needed to produce the perfect resume.
- Use clear section headers (##) for readability.
- Be specific, not generic — every instruction should reference actual skills, keywords, or roles from the data above.
- Include a "Truthfulness Constraint" block reminding the AI not to fabricate skills.
- End with a clear instruction: "Now, here is my current resume — please rewrite it following ALL the above instructions:"

Generate ONLY the master prompt text. Do not add any preamble or explanation — just the prompt itself, starting with the role/context header.
"""


async def generate_master_prompt(
    job_title: str,
    company: str,
    job_data: dict,
    resume_data: dict,
    gap_analysis: dict,
    ats_analysis: dict,
    sub_scores: dict,
    overall_score: float,
    user_rules: str,
    provider: LLMProvider,
) -> str:
    """
    Calls the LLM to synthesize a complete master resume rewrite prompt.
    Returns the final prompt string.
    """
    synthesis_prompt = _build_synthesis_prompt(
        job_title=job_title,
        company=company,
        job_data=job_data,
        resume_data=resume_data,
        gap_analysis=gap_analysis,
        ats_analysis=ats_analysis,
        sub_scores=sub_scores,
        overall_score=overall_score,
        user_rules=user_rules,
    )

    logger.info("master_prompt.generating", job_title=job_title, company=company)
    master_prompt = await provider.generate(synthesis_prompt)
    logger.info("master_prompt.generated", length=len(master_prompt))

    return master_prompt.strip()
