"""Semantic Matcher Agent — evidence-based requirement matching, not keyword matching."""
from __future__ import annotations
import json
from typing import Any, Dict, List, Optional

from langchain_core.messages import HumanMessage, SystemMessage

from src.prompts.semantic_matcher_prompt import SEMANTIC_MATCHER_SYSTEM_PROMPT
from src.utils.context import format_resume_evidence
from src.utils.llm import get_llm
from src.utils.schemas import JDRequirement, SemanticMatchBatch


class SemanticMatcherAgent:
    def __init__(self) -> None:
        self._llm = get_llm().with_structured_output(SemanticMatchBatch)

    def run(
        self,
        resume_data: Dict[str, Any],
        requirements: List[JDRequirement],
        critique_feedback: Optional[List[str]] = None,
    ) -> SemanticMatchBatch:
        requirements_json = json.dumps([r.model_dump() for r in requirements], indent=2)

        feedback_section = ""
        if critique_feedback:
            feedback_section = f"""

━━━━━━━━━━━━━━━━━━━━━━━
PRIOR CRITIQUE FEEDBACK — address these issues directly this pass
━━━━━━━━━━━━━━━━━━━━━━━
{chr(10).join(f"- {issue}" for issue in critique_feedback)}"""

        context = f"""CANDIDATE RESUME EVIDENCE
{format_resume_evidence(resume_data)}

━━━━━━━━━━━━━━━━━━━━━━━
JD REQUIREMENTS TO ASSESS
━━━━━━━━━━━━━━━━━━━━━━━
{requirements_json}{feedback_section}

Produce one RequirementMatch per requirement above."""

        messages = [
            SystemMessage(content=SEMANTIC_MATCHER_SYSTEM_PROMPT),
            HumanMessage(content=context),
        ]
        return self._llm.invoke(messages)
