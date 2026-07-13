"""Interview Question Generator Agent — 10 targeted questions."""
from __future__ import annotations
import json
from typing import Any, Dict, List
from langchain_core.messages import HumanMessage, SystemMessage
from src.prompts.question_prompt import QUESTION_SYSTEM_PROMPT
from src.utils.llm import get_llm
from src.utils.schemas import InterviewQuestions

class InterviewQuestionAgent:
    def __init__(self) -> None:
        self._llm = get_llm().with_structured_output(InterviewQuestions)

    def run(self, missing_skills: List[str], partial_skills: List[str], resume_data: Dict[str, Any], jd_data: Dict[str, Any]) -> InterviewQuestions:
        context = f"""Skill Gaps Identified:
  Missing Skills: {missing_skills}
  Weak/Partial Areas: {partial_skills}

Candidate Background:
  Experience:
{json.dumps(resume_data.get("experience", []), indent=2)}

  Projects:
{json.dumps(resume_data.get("projects", []), indent=2)}

  Education:
{json.dumps(resume_data.get("education", []), indent=2)}

Role Details:
  Title: {jd_data.get("role_title", "Not specified")}
  Key Responsibilities: {jd_data.get("responsibilities", [])}
  Soft Skills Needed: {jd_data.get("soft_skills", [])}

Generate exactly 10 personalized interview questions targeting the gaps above."""

        messages = [SystemMessage(content=QUESTION_SYSTEM_PROMPT), HumanMessage(content=context)]
        return self._llm.invoke(messages)
