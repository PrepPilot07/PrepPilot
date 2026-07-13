"""Hiring Decision Agent — final recommendation."""
from __future__ import annotations
import json
from typing import Any, Dict, List
from langchain_core.messages import HumanMessage, SystemMessage
from src.prompts.decision_prompt import DECISION_SYSTEM_PROMPT
from src.utils.llm import get_llm
from src.utils.schemas import DecisionResult

import os
SCORING_WEIGHTS: Dict[str, float] = {
    "skill":       float(os.getenv("WEIGHT_SKILL",       "0.40")),
    "experience":  float(os.getenv("WEIGHT_EXPERIENCE",  "0.30")),
    "education":   float(os.getenv("WEIGHT_EDUCATION",   "0.10")),
    "culture":     float(os.getenv("WEIGHT_CULTURE",     "0.20")),
}

class DecisionAgent:
    def __init__(self) -> None:
        self._llm = get_llm().with_structured_output(DecisionResult)

    @staticmethod
    def compute_weighted_score(skill_score: float, experience_score: float, education_score: float, culture_score: float) -> float:
        score = (
            skill_score      * SCORING_WEIGHTS["skill"]
            + experience_score * SCORING_WEIGHTS["experience"]
            + education_score  * SCORING_WEIGHTS["education"]
            + culture_score    * SCORING_WEIGHTS["culture"]
        )
        return round(score, 2)

    def run(self, resume_data: Dict[str, Any], jd_data: Dict[str, Any],
            matched_skills: List[str], missing_skills: List[str], partial_skills: List[str],
            skill_score: float, skill_reasoning: str,
            experience_score: float, experience_reasoning: str,
            education_score: float, education_reasoning: str,
            culture_score: float, culture_reasoning: str,
            overall_score: float) -> DecisionResult:

        context = f"""CANDIDATE: {resume_data.get("name", "Unknown")}
ROLE: {jd_data.get("role_title", "Not specified")}

━━━━━━━━━━━━━━━━━━━━━━━
EVALUATION SCORES
━━━━━━━━━━━━━━━━━━━━━━━
Skill Match:   {skill_score:.1f}/100  (weight {int(SCORING_WEIGHTS['skill']*100)}%)
  → {skill_reasoning}

Experience:    {experience_score:.1f}/100  (weight {int(SCORING_WEIGHTS['experience']*100)}%)
  → {experience_reasoning}

Education:     {education_score:.1f}/100  (weight {int(SCORING_WEIGHTS['education']*100)}%)
  → {education_reasoning}

Culture Fit:   {culture_score:.1f}/100  (weight {int(SCORING_WEIGHTS['culture']*100)}%)
  → {culture_reasoning}

OVERALL WEIGHTED SCORE: {overall_score:.1f}/100

━━━━━━━━━━━━━━━━━━━━━━━
SKILL DETAILS
━━━━━━━━━━━━━━━━━━━━━━━
Matched Skills  ({len(matched_skills)}): {matched_skills}
Partial Matches ({len(partial_skills)}): {partial_skills}
Missing Skills  ({len(missing_skills)}): {missing_skills}

Make your final hiring recommendation with full justification."""

        messages = [SystemMessage(content=DECISION_SYSTEM_PROMPT), HumanMessage(content=context)]
        return self._llm.invoke(messages)
