"""Node functions for the fit-analysis graph. Each takes SkillFitState and returns a
partial-state dict that LangGraph merges back in."""
from __future__ import annotations

from typing import Any, Dict, List

from src.agents.critique_agent import CritiqueAgent
from src.agents.gap_reasoner import GapReasonerAgent
from src.agents.jd_parser import JDParserAgent
from src.agents.resume_parser import ResumeParserAgent
from src.agents.semantic_matcher import SemanticMatcherAgent
from src.agents.synthesizer import SynthesizerAgent
from src.graph.state import SkillFitState
from src.utils.schemas import JDRequirement, ParsedJD


def _requirements_for(parsed_jd: ParsedJD) -> List[JDRequirement]:
    """Use the JD parser's structured requirements list, falling back to the flat
    required/preferred skill lists if the model returned an empty requirements list."""
    if parsed_jd.requirements:
        return parsed_jd.requirements
    fallback: List[JDRequirement] = [
        JDRequirement(requirement=skill, category="skill", importance="must_have")
        for skill in parsed_jd.required_skills
    ]
    fallback += [
        JDRequirement(requirement=skill, category="skill", importance="nice_to_have")
        for skill in parsed_jd.preferred_skills
    ]
    return fallback


def resume_parser_node(state: SkillFitState) -> Dict[str, Any]:
    parsed = ResumeParserAgent().run(state.resume_text)
    return {"parsed_resume": parsed}


def jd_parser_node(state: SkillFitState) -> Dict[str, Any]:
    parsed = JDParserAgent().run(state.jd_text)
    return {"parsed_jd": parsed}


def semantic_matcher_node(state: SkillFitState) -> Dict[str, Any]:
    assert state.parsed_resume is not None and state.parsed_jd is not None
    requirements = _requirements_for(state.parsed_jd)
    feedback = state.critique_issues if state.rework_target == "semantic_matcher" else None
    result = SemanticMatcherAgent().run(
        state.parsed_resume.model_dump(), requirements, critique_feedback=feedback
    )
    return {"requirement_matches": result.matches}


def gap_reasoner_node(state: SkillFitState) -> Dict[str, Any]:
    weak_matches = [m for m in state.requirement_matches if m.strength != "strong"]
    if not weak_matches:
        return {"gaps": []}
    assert state.parsed_resume is not None
    feedback = state.critique_issues if state.rework_target == "gap_reasoner" else None
    result = GapReasonerAgent().run(
        state.parsed_resume.model_dump(), weak_matches, critique_feedback=feedback
    )
    return {"gaps": result.gaps}


def critique_node(state: SkillFitState) -> Dict[str, Any]:
    assert state.parsed_resume is not None and state.parsed_jd is not None
    requirements = _requirements_for(state.parsed_jd)
    critique = CritiqueAgent().run(
        state.parsed_resume.model_dump(), requirements, state.requirement_matches, state.gaps
    )
    if critique.passed:
        return {"critique_issues": [], "rework_target": None}
    return {
        "critique_issues": critique.issues,
        "rework_target": critique.rework_target or "semantic_matcher",
        "retry_count": state.retry_count + 1,
    }


def synthesizer_node(state: SkillFitState) -> Dict[str, Any]:
    fit_report = SynthesizerAgent().run(state.requirement_matches, state.gaps)
    return {"fit_report": fit_report}
