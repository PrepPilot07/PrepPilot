"""Critique Agent — self-reflection pass over the draft match + gap analysis."""
from __future__ import annotations
import json
from typing import Any, Dict, List

from langchain_core.messages import HumanMessage, SystemMessage

from src.prompts.critique_prompt import CRITIQUE_SYSTEM_PROMPT
from src.utils.context import format_resume_evidence
from src.utils.llm import get_llm
from src.utils.schemas import CritiqueResult, GapAssessment, JDRequirement, RequirementMatch


class CritiqueAgent:
    def __init__(self) -> None:
        self._llm = get_llm().with_structured_output(CritiqueResult)

    def run(
        self,
        resume_data: Dict[str, Any],
        requirements: List[JDRequirement],
        matches: List[RequirementMatch],
        gaps: List[GapAssessment],
    ) -> CritiqueResult:
        context = f"""CANDIDATE RESUME EVIDENCE
{format_resume_evidence(resume_data)}

━━━━━━━━━━━━━━━━━━━━━━━
JD REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━
{json.dumps([r.model_dump() for r in requirements], indent=2)}

━━━━━━━━━━━━━━━━━━━━━━━
DRAFT REQUIREMENT MATCHES
━━━━━━━━━━━━━━━━━━━━━━━
{json.dumps([m.model_dump() for m in matches], indent=2)}

━━━━━━━━━━━━━━━━━━━━━━━
DRAFT GAP ASSESSMENTS
━━━━━━━━━━━━━━━━━━━━━━━
{json.dumps([g.model_dump() for g in gaps], indent=2)}

Audit the draft above."""

        messages = [SystemMessage(content=CRITIQUE_SYSTEM_PROMPT), HumanMessage(content=context)]
        return self._llm.invoke(messages)
