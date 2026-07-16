"""Synthesizer Agent — combines requirement matches + gaps into the final FitReport."""
from __future__ import annotations
import json
from typing import List

from langchain_core.messages import HumanMessage, SystemMessage

from src.prompts.synthesizer_prompt import SYNTHESIZER_SYSTEM_PROMPT
from src.utils.llm import get_llm
from src.utils.schemas import FitReport, GapAssessment, NarrativeOutput, RequirementMatch

_STRENGTH_VALUE = {"strong": 1.0, "partial": 0.6, "weak": 0.25, "none": 0.0}
_IMPORTANCE_WEIGHT = {"must_have": 2.0, "nice_to_have": 1.0}


class SynthesizerAgent:
    def __init__(self) -> None:
        self._llm = get_llm().with_structured_output(NarrativeOutput)

    @staticmethod
    def compute_score(matches: List[RequirementMatch]) -> float:
        """Weighted average requirement-fit score (must-haves count double)."""
        if not matches:
            return 0.0
        total_weight = sum(_IMPORTANCE_WEIGHT[m.importance] for m in matches)
        if total_weight == 0:
            return 0.0
        weighted = sum(
            _IMPORTANCE_WEIGHT[m.importance] * _STRENGTH_VALUE[m.strength] for m in matches
        )
        return round((weighted / total_weight) * 100, 2)

    @staticmethod
    def bucket_requirements(matches: List[RequirementMatch]) -> tuple[List[str], List[str], List[str]]:
        """Split requirement names into matched/partial/missing for backward-compatible fields."""
        matched = [m.requirement for m in matches if m.strength == "strong"]
        partial = [m.requirement for m in matches if m.strength == "partial"]
        missing = [m.requirement for m in matches if m.strength in ("weak", "none")]
        return matched, missing, partial

    def run(
        self,
        matches: List[RequirementMatch],
        gaps: List[GapAssessment],
    ) -> FitReport:
        score = self.compute_score(matches)
        matched, missing, partial = self.bucket_requirements(matches)

        context = f"""OVERALL SCORE: {score:.1f}/100

━━━━━━━━━━━━━━━━━━━━━━━
FINALIZED REQUIREMENT MATCHES
━━━━━━━━━━━━━━━━━━━━━━━
{json.dumps([m.model_dump() for m in matches], indent=2)}

━━━━━━━━━━━━━━━━━━━━━━━
FINALIZED GAP ASSESSMENTS
━━━━━━━━━━━━━━━━━━━━━━━
{json.dumps([g.model_dump() for g in gaps], indent=2)}

Write the final evidence-cited reasoning paragraph."""

        messages = [SystemMessage(content=SYNTHESIZER_SYSTEM_PROMPT), HumanMessage(content=context)]
        narrative: NarrativeOutput = self._llm.invoke(messages)

        return FitReport(
            matched=matched,
            missing=missing,
            partial=partial,
            score=score,
            reasoning=narrative.reasoning,
            requirement_matches=matches,
            gaps=gaps,
        )
