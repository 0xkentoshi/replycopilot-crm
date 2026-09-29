from fastapi import FastAPI, HTTPException

from app.config import Settings
from app.schemas import AnalyzeRequest, AnalyzeResponse, KnowledgeEntry
from app.services.ai_provider import OpenAICompatibleProvider, ProviderError
from app.services.copilot import analyze
from app.services.demo_engine import DemoProvider
from app.services.retrieval import load_knowledge


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    app = FastAPI(title="ReplyCopilot CRM", version="1.0.0")
    knowledge = load_knowledge()
    provider = (
        OpenAICompatibleProvider(settings)
        if settings.mode == "live"
        else DemoProvider()
    )

    @app.get("/api/health")
    def health():
        return {"status": "ok", "mode": settings.mode}

    @app.get("/api/knowledge", response_model=list[KnowledgeEntry])
    def get_knowledge():
        return knowledge

    @app.post("/api/analyze", response_model=AnalyzeResponse)
    async def analyze_message(request: AnalyzeRequest):
        try:
            return await analyze(request.customer_message, knowledge, provider)
        except ProviderError as exc:
            raise HTTPException(
                status_code=502,
                detail="AI-сервис недоступен или вернул некорректный результат. Попробуйте ещё раз.",
            ) from exc

    return app


app = create_app()
