"""Assembles the fit-analysis StateGraph: parse -> match -> gap-reason -> critique
(loops back on failure, capped) -> synthesize."""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from src.graph import nodes
from src.graph.state import MAX_CRITIQUE_RETRIES, SkillFitState


def _route_after_match(state: SkillFitState) -> Literal["gap_reasoner", "critique_node"]:
    if any(m.strength != "strong" for m in state.requirement_matches):
        return "gap_reasoner"
    return "critique_node"


def _route_after_critique(
    state: SkillFitState,
) -> Literal["synthesizer", "semantic_matcher", "gap_reasoner"]:
    if not state.critique_issues or state.retry_count > MAX_CRITIQUE_RETRIES:
        return "synthesizer"
    return state.rework_target or "semantic_matcher"


def build_fit_analysis_graph() -> CompiledStateGraph:
    graph = StateGraph(SkillFitState)

    graph.add_node("resume_parser", nodes.resume_parser_node)
    graph.add_node("jd_parser", nodes.jd_parser_node)
    graph.add_node("semantic_matcher", nodes.semantic_matcher_node)
    graph.add_node("gap_reasoner", nodes.gap_reasoner_node)
    graph.add_node("critique_node", nodes.critique_node)
    graph.add_node("synthesizer", nodes.synthesizer_node)

    graph.add_edge(START, "resume_parser")
    graph.add_edge(START, "jd_parser")
    graph.add_edge("resume_parser", "semantic_matcher")
    graph.add_edge("jd_parser", "semantic_matcher")

    graph.add_conditional_edges(
        "semantic_matcher",
        _route_after_match,
        {"gap_reasoner": "gap_reasoner", "critique_node": "critique_node"},
    )
    graph.add_edge("gap_reasoner", "critique_node")

    graph.add_conditional_edges(
        "critique_node",
        _route_after_critique,
        {
            "synthesizer": "synthesizer",
            "semantic_matcher": "semantic_matcher",
            "gap_reasoner": "gap_reasoner",
        },
    )
    graph.add_edge("synthesizer", END)

    return graph.compile()


@lru_cache(maxsize=1)
def get_fit_analysis_graph() -> CompiledStateGraph:
    return build_fit_analysis_graph()
