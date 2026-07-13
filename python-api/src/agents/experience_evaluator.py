"""Experience Evaluator Agent."""
from __future__ import annotations
import json
from typing import Any, Dict
from langchain_core.messages import HumanMessage, SystemMessage
from src.prompts.experience_prompt import EXPERIENCE_SYSTEM_PROMPT
from src.utils.llm import get_llm
from src.utils.schemas import EvaluationResult

class ExperienceEvaluatorAgent:
    def __init__(self) -> None:
        self._llm = get_llm().with_structured_output(EvaluationResult)

    def run(self, resume_data: Dict[str, Any], jd_data: Dict[str, Any]) -> EvaluationResult:
        experience = resume_data.get("experience", [])
        jd_experience_req = jd_data.get("experience_required", "Not specified")
        jd_responsibilities = jd_data.get("responsibilities", [])

        context = f"""Candidate Work Experience:
{json.dumps(experience, indent=2)}

Job Description Requirements:
  Experience Required: {jd_experience_req}
  Key Responsibilities:
{json.dumps(jd_responsibilities, indent=2)}

Evaluate the candidate's experience against these requirements and provide a score (0–100) with reasoning."""

        messages = [SystemMessage(content=EXPERIENCE_SYSTEM_PROMPT), HumanMessage(content=context)]
        return self._llm.invoke(messages)
