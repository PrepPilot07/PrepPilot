"""Resume Summarizer Agent — narrative executive summary."""
from __future__ import annotations
import json
from typing import Any, Dict
from langchain_core.messages import HumanMessage, SystemMessage
from src.utils.llm import get_llm


def _extract_text(content: Any) -> str:
    """Gemini sometimes returns `.content` as a list of content blocks (each a
    dict with a "text" key, alongside non-textual metadata like thought
    signatures) instead of a plain string. Extract just the text."""
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = [
            block if isinstance(block, str) else block.get("text", "")
            for block in content
            if isinstance(block, str) or isinstance(block, dict)
        ]
        return "".join(parts).strip()
    return str(content).strip()

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
        return _extract_text(response.content)
