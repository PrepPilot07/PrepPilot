"""
Fuzzy skill matching utilities using RapidFuzz.
Provides fast, threshold-based comparison of skill lists.
"""
from __future__ import annotations

from typing import List, Tuple

from rapidfuzz import fuzz, process

# A match above this score is considered a full match
MATCH_THRESHOLD: int = 85
# A match between this and MATCH_THRESHOLD is a partial match
PARTIAL_THRESHOLD: int = 60


def find_skill_matches(
    resume_skills: List[str],
    jd_skills: List[str],
    match_threshold: int = MATCH_THRESHOLD,
    partial_threshold: int = PARTIAL_THRESHOLD,
) -> Tuple[List[str], List[str], List[str]]:
    """
    Categorize JD skills as matched, partial, or missing based on resume skills.

    Uses `token_set_ratio` which handles word-order differences
    (e.g. "machine learning" vs "learning machine").

    Args:
        resume_skills: Skills found in the resume.
        jd_skills: Skills required by the job description.
        match_threshold: Score >= this → full match.
        partial_threshold: Score >= this (and < match_threshold) → partial match.

    Returns:
        Tuple of (matched, partial, missing) lists of JD skill names.
    """
    if not resume_skills:
        return [], [], list(jd_skills)

    matched: List[str] = []
    partial: List[str] = []
    missing: List[str] = []

    for jd_skill in jd_skills:
        result = process.extractOne(
            jd_skill,
            resume_skills,
            scorer=fuzz.token_set_ratio,
        )

        if result is None:
            missing.append(jd_skill)
        elif result[1] >= match_threshold:
            matched.append(jd_skill)
        elif result[1] >= partial_threshold:
            partial.append(jd_skill)
        else:
            missing.append(jd_skill)

    return matched, partial, missing


def compute_skill_score(
    matched: List[str],
    partial: List[str],
    missing: List[str],
) -> float:
    """
    Compute a skill coverage score from 0 to 100.

    Matched skills count as 1.0, partial as 0.5, missing as 0.

    Args:
        matched: Fully matched JD skills.
        partial: Partially matched JD skills.
        missing: Missing JD skills.

    Returns:
        Float score in [0.0, 100.0].
    """
    total = len(matched) + len(partial) + len(missing)
    if total == 0:
        return 0.0
    raw = (len(matched) * 1.0 + len(partial) * 0.5) / total * 100
    return round(raw, 2)
