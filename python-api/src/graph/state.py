"""Typed state passed between nodes of the fit-analysis graph."""
from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from src.utils.schemas import FitReport, GapAssessment, ParsedJD, ParsedResume, RequirementMatch

MAX_CRITIQUE_RETRIES = 2


class SkillFitState(BaseModel):
    """State threaded through the resume/JD parsing + evidence-based fit graph."""

    # Inputs
    resume_text: str
    jd_text: str

    # resume_parser / jd_parser outputs
    parsed_resume: Optional[ParsedResume] = None
    parsed_jd: Optional[ParsedJD] = None

    # semantic_matcher / gap_reasoner outputs
    requirement_matches: List[RequirementMatch] = Field(default_factory=list)
    gaps: List[GapAssessment] = Field(default_factory=list)

    # critique_node bookkeeping
    critique_issues: List[str] = Field(default_factory=list)
    retry_count: int = 0
    rework_target: Optional[Literal["semantic_matcher", "gap_reasoner"]] = None

    # synthesizer output
    fit_report: Optional[FitReport] = None
