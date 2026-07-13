"""Job Description Parser Agent."""
from __future__ import annotations
from langchain_core.messages import HumanMessage, SystemMessage
from src.prompts.jd_prompt import JD_SYSTEM_PROMPT
from src.utils.llm import get_llm
from src.utils.schemas import ParsedJD

class JDParserAgent:
    def __init__(self) -> None:
        self._llm = get_llm().with_structured_output(ParsedJD)

    def run(self, jd_text: str) -> ParsedJD:
        messages = [
            SystemMessage(content=JD_SYSTEM_PROMPT),
            HumanMessage(content=f"Parse the following job description:\n\n{jd_text}"),
        ]
        result: ParsedJD = self._llm.invoke(messages)
        return result
