"""Gap Reasoner Agent — real-world impact of weak/missing requirements."""
from __future__ import annotations
import json
from typing import Any, Dict, List, Optional

from langchain_core.messages import HumanMessage, SystemMessage

from src.prompts.gap_reasoner_prompt import GAP_REASONER_SYSTEM_PROMPT
from src.utils.context import format_resume_evidence
from src.utils.llm import get_llm
from src.utils.schemas import GapAssessmentBatch, RequirementMatch


class GapReasonerAgent:
    def __init__(self) -> None:
        self._llm = get_llm().with_structured_output(GapAssessmentBatch)

    def run(
        self,
        resume_data: Dict[str, Any],
        weak_matches: List[RequirementMatch],
        critique_feedback: Optional[List[str]] = None,
    ) -> GapAssessmentBatch:
        matches_json = json.dumps([m.model_dump() for m in weak_matches], indent=2)

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
WEAK / PARTIAL / MISSING REQUIREMENTS TO ASSESS
━━━━━━━━━━━━━━━━━━━━━━━
{matches_json}{feedback_section}

Produce one GapAssessment per requirement above."""

        messages = [
            SystemMessage(content=GAP_REASONER_SYSTEM_PROMPT),
            HumanMessage(content=context),
        ]
        return self._llm.invoke(messages)
