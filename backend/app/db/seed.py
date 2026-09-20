"""
app/db/seed.py

Seeds local dev data: one demo user + the canonical skill taxonomy
starter set (so resume_skills/job_requirements have something to
join against besides freeform strings). Run with: make seed
(docker exec backend python -m app.db.seed).
"""
from __future__ import annotations

import asyncio
import uuid

from sqlalchemy import select

from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal
from app.dependencies import DEFAULT_USER_ID
from app.models.skill import Skill
from app.models.user import User

logger = get_logger(__name__)

STARTER_SKILLS = [
    ("Python", "language", ["Python3"]),
    ("JavaScript", "language", ["JS", "ECMAScript"]),
    ("TypeScript", "language", ["TS"]),
    ("SQL", "language", []),
    ("React", "framework", ["ReactJS"]),
    ("Vue", "framework", ["VueJS"]),
    ("FastAPI", "framework", []),
    ("Django", "framework", []),
    ("Docker", "tool", []),
    ("Kubernetes", "tool", ["K8s"]),
    ("PostgreSQL", "tool", ["Postgres"]),
    ("AWS", "tool", ["Amazon Web Services"]),
    ("Git", "tool", []),
    ("Agile", "domain", ["Scrum"]),
    ("Communication", "soft", []),
    ("Leadership", "soft", []),
]


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        existing_user = await db.execute(select(User).where(User.id == DEFAULT_USER_ID))
        if existing_user.scalar_one_or_none() is None:
            db.add(User(id=DEFAULT_USER_ID, email="dev@ai-job-assistant.local", full_name="Dev User"))
            logger.info("seed.user.created", user_id=str(DEFAULT_USER_ID))

        for name, category, aliases in STARTER_SKILLS:
            existing = await db.execute(select(Skill).where(Skill.name == name))
            if existing.scalar_one_or_none() is None:
                db.add(Skill(id=uuid.uuid4(), name=name, category=category, aliases=aliases))

        await db.commit()
        logger.info("seed.completed", skills_seeded=len(STARTER_SKILLS))


if __name__ == "__main__":
    asyncio.run(seed())
