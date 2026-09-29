import json
import re
import unicodedata
from pathlib import Path

from app.schemas import KnowledgeEntry

KB_PATH = Path(__file__).resolve().parents[2] / "data" / "knowledge_base.json"


def load_knowledge() -> list[KnowledgeEntry]:
    return [
        KnowledgeEntry.model_validate(item)
        for item in json.loads(KB_PATH.read_text(encoding="utf-8"))
    ]


def normalize(text: str) -> list[str]:
    return re.findall(
        r"[a-zа-я0-9]+", unicodedata.normalize("NFKC", text).lower().replace("ё", "е")
    )


def retrieve(
    message: str, entries: list[KnowledgeEntry], limit: int = 4
) -> list[KnowledgeEntry]:
    terms = normalize(message)
    ranked = []
    for entry in entries:
        score = sum(
            3
            for keyword in entry.keywords
            if all(
                any(term.startswith(part) for term in terms)
                for part in normalize(keyword)
            )
        )
        if score:
            score += len(set(terms) & set(normalize(entry.title)))
            ranked.append((score, entry))
    return [entry for _, entry in sorted(ranked, key=lambda pair: -pair[0])[:limit]]
