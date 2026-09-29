from app.schemas import KnowledgeEntry, ReplyPlan
from app.services.retrieval import normalize


def detect_intent(message: str) -> str:
    text = " ".join(normalize(message))
    if any(
        word in text for word in ("erp", "ерп", "гарант", "скид", "возврат", "договор")
    ):
        return "unknown"
    if any(word in text for word in ("дорого", "дешев", "конкурент")):
        return "price_objection"
    if any(
        word in text for word in ("готовы", "готов начать", "начинаем", "ready to buy")
    ):
        return "ready_to_buy"
    if any(word in text for word in ("недел", "срок", "когда", "успе", "timeline")):
        return "timeline"
    if any(word in text for word in ("стоит", "цен", "стоим", "price", "cost")):
        return "pricing"
    return "information"


class DemoProvider:
    async def plan(self, message: str, entries: list[KnowledgeEntry]) -> ReplyPlan:
        intent = detect_intent(message)
        ids = [entry.id for entry in entries]
        if intent == "unknown" or not ids:
            return ReplyPlan(intent="unknown", fact_ids=[])
        return ReplyPlan(intent=intent, fact_ids=ids)
