"""Resume Summarizer Agent — narrative executive summary."""
from __future__ import annotations
import json
from typing import Any, Dict
from langchain_core.messages import HumanMessage, SystemMessage
from src.utils.llm import get_llm

_SUMMARIZER_SYSTEM_PROMPT: str = """You are a professional resume writer tasked with creating a concise executive summary.

From the provided structured resume data, write a 3–5 sentence professional summary in third person.

Guidelines:
- Highlight total years of experience and seniority level
- Mention the 3–5 most relevant technical skills
- Reference 1–2 notable achievements (if present)
- Keep it factual — do not exaggerate or infer
- Write in present tense (e.g., "She brings 5 years of...")
- Do NOT start with the candidate's name"""

class ResumeSummarizerAgent:
    def __init__(self) -> None:
        self._llm = get_llm()

    def run(self, resume_data: Dict[str, Any]) -> str:
        context = f"""Resume Data:
{json.dumps(resume_data, indent=2, default=str)}

Generate a professional summary paragraph (3–5 sentences, third person)."""

        messages = [SystemMessage(content=_SUMMARIZER_SYSTEM_PROMPT), HumanMessage(content=context)]
        response = self._llm.invoke(messages)
        return str(response.content).strip()
