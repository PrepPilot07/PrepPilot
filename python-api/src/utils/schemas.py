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


class ParsedJD(BaseModel):
    """Structured representation of a parsed job description."""

    role_title: str = ""
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    experience_required: str = ""
    education_required: str = ""
    responsibilities: List[str] = Field(default_factory=list)
    soft_skills: List[str] = Field(default_factory=list)


class SkillMatchResult(BaseModel):
    """Result of comparing resume skills against JD requirements."""

    matched: List[str] = Field(default_factory=list)
    missing: List[str] = Field(default_factory=list)
    partial: List[str] = Field(default_factory=list)
    score: float = Field(default=0.0, ge=0.0, le=100.0)
    reasoning: str = ""


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

    questions: List[str] = Field(default_factory=list)


class DecisionResult(BaseModel):
    """Final hiring decision with full justification."""

    overall_score: float = Field(ge=0.0, le=100.0)
    recommendation: Literal["Strong Hire", "Hire", "Maybe", "Reject"]
    reasoning: str
    pros: List[str] = Field(default_factory=list)
    cons: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
