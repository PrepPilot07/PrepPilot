"""Culture Fit Agent — minimum context to prevent hallucination."""
from __future__ import annotations
from langchain_core.messages import HumanMessage, SystemMessage
from src.prompts.culture_prompt import CULTURE_SYSTEM_PROMPT
from src.utils.llm import get_llm
from src.utils.schemas import CultureFitResult

_JD_CHAR_LIMIT: int = 2000

class CultureFitAgent:
    def __init__(self) -> None:
        self._llm = get_llm().with_structured_output(CultureFitResult)

    def run(self, candidate_summary: str, jd_text: str) -> CultureFitResult:
        summary_section = (
            candidate_summary.strip()
            if candidate_summary.strip()
            else "No professional summary was provided in the resume."
        )

        context = f"""Candidate Professional Summary:
{summary_section}

Job Description (excerpt):
{jd_text[:_JD_CHAR_LIMIT]}

Assess culture fit based ONLY on the above. Acknowledge uncertainty where evidence is absent."""

        messages = [SystemMessage(content=CULTURE_SYSTEM_PROMPT), HumanMessage(content=context)]
        return self._llm.invoke(messages)
