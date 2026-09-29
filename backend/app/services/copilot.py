from app.schemas import AnalyzeResponse, KnowledgeEntry, ReplyPlan
from app.services.ai_provider import Provider, ProviderError
from app.services.demo_engine import detect_intent
from app.services.policy import render_response
from app.services.retrieval import retrieve


async def analyze(
    message: str, knowledge: list[KnowledgeEntry], provider: Provider
) -> AnalyzeResponse:
    relevant = retrieve(message, knowledge)
    intent = detect_intent(message)
    # An objection without a named service must not silently assume a service/price.
    if intent == "price_objection":
        relevant = [e for e in knowledge if e.id in ("discovery", "scope")]
    if intent == "unknown" or not relevant:
        return render_response(ReplyPlan(intent="unknown", fact_ids=[]), [])
    plan = await provider.plan(message, relevant)
    if not set(plan.fact_ids).issubset({e.id for e in relevant}):
        raise ProviderError("AI selected unverified knowledge")
    return render_response(plan, relevant)
