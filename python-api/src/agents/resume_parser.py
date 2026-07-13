"""Resume Parser Agent."""
from __future__ import annotations
from langchain_core.messages import HumanMessage, SystemMessage
from src.prompts.resume_prompt import RESUME_SYSTEM_PROMPT
from src.utils.llm import get_llm
from src.utils.schemas import ParsedResume

class ResumeParserAgent:
    def __init__(self) -> None:
        self._llm = get_llm().with_structured_output(ParsedResume)

    def run(self, resume_text: str) -> ParsedResume:
        messages = [
            SystemMessage(content=RESUME_SYSTEM_PROMPT),
            HumanMessage(content=f"Parse the following resume:\n\n{resume_text}"),
        ]
        result: ParsedResume = self._llm.invoke(messages)
        return result
