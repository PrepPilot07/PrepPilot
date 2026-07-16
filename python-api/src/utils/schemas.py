"""
Pydantic schemas for structured data across the resume screening pipeline.
Every agent's input and output is typed using these models.
"""
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


# ── Sub-models ────────────────────────────────────────────────────────────────

class Education(BaseModel):
    degree: str = ""
    institution: str = ""
    year: str = ""
    branch: str = ""
    gpa: Optional[str] = None


class Experience(BaseModel):
    company: str = ""
    role: str = ""
    duration: str = ""
    responsibilities: List[str] = Field(default_factory=list)
    achievements: List[str] = Field(default_factory=list)


class Project(BaseModel):
    name: str = ""
    description: str = ""
    technologies: List[str] = Field(default_factory=list)


# ── Primary schemas ───────────────────────────────────────────────────────────

class ParsedResume(BaseModel):
    """Structured representation of a parsed candidate resume."""

    name: str = ""
    email: str = ""
    phone: str = ""
    education: List[Education] = Field(default_factory=list)
    experience: List[Experience] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    projects: List[Project] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    summary: str = ""


class JDRequirement(BaseModel):
    """A single JD requirement with inferred importance and rationale."""

    requirement: str = Field(description="The requirement itself, in a few words")
    category: Literal["skill", "experience", "education", "soft_skill", "responsibility"] = "skill"
    importance: Literal["must_have", "nice_to_have"] = "must_have"
    rationale: str = Field(
        default="",
        description="Why this requirement likely matters for the role, beyond its literal wording",
    )


class ParsedJD(BaseModel):
    """Structured representation of a parsed job description."""

    role_title: str = ""
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    experience_required: str = ""
    education_required: str = ""
    responsibilities: List[str] = Field(default_factory=list)
    soft_skills: List[str] = Field(default_factory=list)
    requirements: List[JDRequirement] = Field(
        default_factory=list,
        description="Every requirement implied by the JD (skills, experience, education, "
        "soft skills, responsibilities), each tagged with importance and why it matters",
    )


class SkillMatchResult(BaseModel):
    """Result of comparing resume skills against JD requirements."""

    matched: List[str] = Field(default_factory=list)
    missing: List[str] = Field(default_factory=list)
    partial: List[str] = Field(default_factory=list)
    score: float = Field(default=0.0, ge=0.0, le=100.0)
    reasoning: str = ""


class RequirementMatch(BaseModel):
    """Evidence-based assessment of one JD requirement against the resume."""

    requirement: str
    category: str = "skill"
    importance: Literal["must_have", "nice_to_have"] = "must_have"
    strength: Literal["strong", "partial", "weak", "none"] = "none"
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)
    evidence: List[str] = Field(
        default_factory=list,
        description="Specific resume content (roles, projects, achievements) that justifies this strength",
    )
    reasoning: str = ""


class SemanticMatchBatch(BaseModel):
    """Structured-output wrapper: one match per JD requirement."""

    matches: List[RequirementMatch] = Field(default_factory=list)


class GapAssessment(BaseModel):
    """Reasoning about the real-world impact of a weak/missing requirement."""

    requirement: str
    severity: Literal["hard_blocker", "learnable", "partially_covered"] = "learnable"
    explanation: str = ""


class GapAssessmentBatch(BaseModel):
    """Structured-output wrapper: one gap assessment per weak/partial/missing requirement."""

    gaps: List[GapAssessment] = Field(default_factory=list)


class CritiqueResult(BaseModel):
    """Self-critique pass over a draft semantic match + gap analysis."""

    passed: bool = True
    issues: List[str] = Field(
        default_factory=list,
        description="Specific problems found: generic reasoning, unsupported claims, hallucinated evidence",
    )
    flagged_requirements: List[str] = Field(default_factory=list)
    rework_target: Optional[Literal["semantic_matcher", "gap_reasoner"]] = None


class NarrativeOutput(BaseModel):
    """Structured-output wrapper for the synthesizer's evidence-cited narrative."""

    reasoning: str


class FitReport(BaseModel):
    """Final evidence-based skill/requirement fit report."""

    # Backward-compatible fields — consumed as-is by DecisionAgent,
    # InterviewQuestionAgent, and the existing frontend.
    matched: List[str] = Field(default_factory=list)
    missing: List[str] = Field(default_factory=list)
    partial: List[str] = Field(default_factory=list)
    score: float = Field(default=0.0, ge=0.0, le=100.0)
    reasoning: str = ""

    # Evidence-based additions.
    requirement_matches: List[RequirementMatch] = Field(default_factory=list)
    gaps: List[GapAssessment] = Field(default_factory=list)


class EvaluationResult(BaseModel):
    """Generic evaluation result with a numeric score and textual reasoning."""

    score: float = Field(ge=0.0, le=100.0)
    reasoning: str


class CultureFitResult(BaseModel):
    """Culture fit evaluation with per-dimension scores (0–10 each)."""

    communication: float = Field(ge=0.0, le=10.0)
    leadership: float = Field(ge=0.0, le=10.0)
    ownership: float = Field(ge=0.0, le=10.0)
    problem_solving: float = Field(ge=0.0, le=10.0)
    adaptability: float = Field(ge=0.0, le=10.0)
    overall_score: float = Field(ge=0.0, le=100.0)
    reasoning: str
    uncertainty_notes: str = ""


class InterviewQuestions(BaseModel):
    """10 personalized interview questions targeting skill gaps."""

    questions: List[str] = Field(description="List of exactly 10 interview questions")


class DecisionResult(BaseModel):
    """Final hiring decision with full justification."""

    overall_score: float = Field(ge=0.0, le=100.0)
    recommendation: Literal["Strong Hire", "Hire", "Maybe", "Reject"]
    reasoning: str
    pros: List[str] = Field(default_factory=list)
    cons: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
