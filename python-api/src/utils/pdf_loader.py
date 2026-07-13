"""
PDF text loader using PyMuPDF (fitz).
Extracts raw text page by page preserving order.
"""
from __future__ import annotations

from pathlib import Path

import fitz  # PyMuPDF


def load_pdf(file_path: str) -> str:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF file not found: {file_path}")

    text_parts: list[str] = []
    with fitz.open(str(path)) as doc:
        for page in doc:
            page_text = page.get_text()
            if page_text.strip():
                text_parts.append(page_text)

    return "\n".join(text_parts).strip()
