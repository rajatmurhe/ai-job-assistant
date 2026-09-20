"""
ai/matching/semantic_matcher.py

pgvector cosine similarity between a resume embedding and a job
embedding. The actual vector storage/query lives in the DB layer
(Module 10, pgvector column); this module is the pure-math piece so
it's testable without a live Postgres connection, and is what the
DB-side query ultimately delegates to for any in-Python comparisons
(e.g. re-ranking a candidate shortlist already fetched from the DB).
"""
from __future__ import annotations

import math


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    if len(vec_a) != len(vec_b):
        raise ValueError(f"Embedding dimension mismatch: {len(vec_a)} vs {len(vec_b)}")
    if not vec_a or not vec_b:
        return 0.0

    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot / (norm_a * norm_b)


def semantic_score(resume_embedding: list[float], job_embedding: list[float]) -> float:
    """
    Cosine similarity in [-1, 1], rescaled to a 0-100 match score.
    A cosine of 0 (orthogonal / unrelated) maps to 0, not 50, since
    unrelated resume/JD pairs should score low, not "medium".
    """
    cos = cosine_similarity(resume_embedding, job_embedding)
    return max(0.0, cos) * 100
