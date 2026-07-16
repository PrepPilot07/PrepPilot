"""Shared context-formatting helpers for graph node prompts."""
from __future__ import annotations
import json
from typing import Any, Dict


def format_resume_evidence(resume_data: Dict[str, Any]) -> str:
    """Render a resume's experience/projects/skills/certifications as evidence for an LLM prompt."""
    return f"""Work Experience:
{json.dumps(resume_data.get("experience", []), indent=2)}

Projects:
{json.dumps(resume_data.get("projects", []), indent=2)}

Skills (as self-reported by the candidate — do not treat this list as exhaustive; the
experience/projects above are the real evidence):
{resume_data.get("skills", [])}

Certifications:
{resume_data.get("certifications", [])}"""
