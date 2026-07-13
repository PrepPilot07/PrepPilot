"""
LLM factory — single source of truth for ChatGoogleGenerativeAI instantiation.
All agents must import the LLM from here, never instantiate it directly.
"""
from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv(override=True)


@lru_cache(maxsize=1)
def get_llm() -> ChatGoogleGenerativeAI:
    """
    Return a cached ChatGoogleGenerativeAI instance configured from environment variables.

    Environment variables:
        GOOGLE_API_KEY  — required
        GEMINI_MODEL    — default: gemini-2.5-flash
        GEMINI_TEMPERATURE — default: 0
    """
    api_key = os.getenv("GOOGLE_API_KEY", "").strip()
    if not api_key:
        raise EnvironmentError(
            "GOOGLE_API_KEY is not set. "
            "Please add it to your python-api/.env file."
        )

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    temperature = float(os.getenv("GEMINI_TEMPERATURE", "0"))

    return ChatGoogleGenerativeAI(
        model=model,
        temperature=temperature,
        google_api_key=api_key,
    )
