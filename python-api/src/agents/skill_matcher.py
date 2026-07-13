"""Skill Matching Agent — RapidFuzz pre-match + LLM refinement."""
from __future__ import annotations
from typing import List
from langchain_core.messages import HumanMessage, SystemMessage
from src.prompts.skill_prompt import SKILL_SYSTEM_PROMPT
from src.utils.llm import get_llm
from src.utils.schemas import SkillMatchResult
from src.utils.similarity import compute_skill_score, find_skill_matches

class SkillMatcherAgent:
    def __init__(self) -> None:
        self._llm = get_llm().with_structured_output(SkillMatchResult)

    def run(self, resume_skills: List[str], jd_required_skills: List[str], jd_preferred_skills: List[str]) -> SkillMatchResult:
        all_jd_skills = list(dict.fromkeys(jd_required_skills + jd_preferred_skills))
        fuzzy_matched, fuzzy_partial, fuzzy_missing = find_skill_matches(resume_skills, all_jd_skills)
        fuzzy_score = compute_skill_score(fuzzy_matched, fuzzy_partial, fuzzy_missing)

        context = f"""Resume Skills:
{resume_skills}

JD Required Skills: {jd_required_skills}
JD Preferred Skills: {jd_preferred_skills}

Pre-computed Fuzzy Match Results:
  Matched  ({len(fuzzy_matched)}): {fuzzy_matched}
  Partial  ({len(fuzzy_partial)}): {fuzzy_partial}
  Missing  ({len(fuzzy_missing)}): {fuzzy_missing}
  Fuzzy Score: {fuzzy_score:.1f}/100

Review these results, correct synonym mismatches, and provide your final analysis."""

        messages = [SystemMessage(content=SKILL_SYSTEM_PROMPT), HumanMessage(content=context)]
        return self._llm.invoke(messages)
