import asyncio

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.schemas import AnalyzeResponse, ReplyPlan
from app.services.ai_provider import ProviderError
from app.services.copilot import analyze
from app.services.retrieval import load_knowledge, retrieve

client = TestClient(create_app(Settings(ai_api_key="", _env_file=None)))


def result(message):
    response = client.post("/api/analyze", json={"customer_message": message})
    assert response.status_code == 200
    return response.json()


def test_retrieval_advertising():
    assert (
        retrieve("Сколько стоит настройка РЕКЛАМЫ?", load_knowledge())[0].id
        == "advertising"
    )


def test_price_and_schema():
    data = result("Здравствуйте, сколько стоит настройка рекламы?")
    AnalyzeResponse.model_validate(data)
    assert "25 000 ₽" in data["customer_reply"]
    assert "3–5 рабочих дней" not in data["customer_reply"]
    assert "материал" not in data["customer_reply"]
    assert "доступ" not in data["customer_reply"]
    assert "18 000 ₽" not in data["customer_reply"]
    assert "18 000 ₽" in data["manager_hint"]
    assert [(e["id"], e["matched_facts"]) for e in data["used_knowledge"]] == [
        ("advertising", ["Настройка контекстной рекламы — от 25 000 ₽."])
    ]


def test_timeline():
    data = result("Сможете запустить рекламу до следующей недели?")
    assert "3–5 рабочих дней" in data["customer_reply"]
    assert "после получения" in data["customer_reply"]
    assert "25 000 ₽" not in data["customer_reply"]
    assert data["customer_reply"].count("материал") == 1
    assert data["customer_reply"].count("доступ") == 1
    assert [(e["id"], e["matched_facts"]) for e in data["used_knowledge"]] == [
        (
            "advertising",
            [
                "Запуск занимает 3–5 рабочих дней после получения необходимых доступов и материалов."
            ],
        )
    ]
    for text in ("доступов", "материалов", "целевую дату", "Не обещайте"):
        assert text in data["manager_hint"]
    assert data["missing_information"]


def test_unknown_erp():
    data = result("Можете интегрироваться с нашей ERP X?")
    assert data["intent"] == "unknown"
    assert "нужно уточнение" in data["customer_reply"]
    assert data["confidence"] < 0.5
    assert data["upsell_opportunity"] == "none"
    assert data["missing_information"] and not data["used_knowledge"]


def test_customer_internal_separation():
    data = result("Нужна настройка рекламы. Готовы начать на следующей неделе.")
    for private in (
        "INTERNAL",
        "confidence",
        "high purchase intent",
        "Предложите",
        data["manager_hint"],
    ):
        assert private not in data["customer_reply"]
    assert "18 000" not in data["customer_reply"]


def test_high_intent():
    data = result(
        "Нужна настройка рекламы. Если всё устроит, готовы начать на следующей неделе."
    )
    assert data["upsell_opportunity"] == "high"
    assert "ведение" in data["manager_hint"]
    assert "дальнейшее ведение рекламы — от 18 000 ₽" in data["manager_hint"]
    for text in ("доступов", "материалов", "целевую дату"):
        assert text in data["manager_hint"]
    assert "3–5 рабочих дней" in data["customer_reply"]
    assert "25 000 ₽" not in data["customer_reply"]
    assert "18 000 ₽" not in data["customer_reply"]
    assert data["customer_reply"].count("материал") == 1


def test_objection():
    data = result("Почему так дорого? Конкуренты предложили почти в два раза дешевле.")
    assert "Понимаю" in data["customer_reply"]
    assert "консультация бесплатна" in data["customer_reply"]
    assert "25 000" not in data["customer_reply"]


def test_validation():
    for message in ("", "   ", "x" * 4001):
        assert (
            client.post("/api/analyze", json={"customer_message": message}).status_code
            == 422
        )


def test_knowledge():
    data = client.get("/api/knowledge").json()
    assert len(data) == 12
    assert len({e["id"] for e in data}) == 12


def test_demo_without_key():
    assert client.get("/api/health").json()["mode"] == "demo"
    assert result("Сколько стоит реклама?") == result("Сколько стоит реклама?")


def test_live_rejects_unverified_ids():
    class BadProvider:
        async def plan(self, message, entries):
            return ReplyPlan(intent="pricing", fact_ids=["invented"])

    with pytest.raises(ProviderError):
        asyncio.run(analyze("Сколько стоит реклама?", load_knowledge(), BadProvider()))


def test_live_failure_has_useful_api_error(monkeypatch):
    async def broken(self, *args, **kwargs):
        raise httpx.ConnectError("offline")

    monkeypatch.setattr(httpx.AsyncClient, "post", broken)
    live = TestClient(create_app(Settings(ai_api_key="test", _env_file=None)))
    response = live.post("/api/analyze", json={"customer_message": "Цена рекламы?"})
    assert response.status_code == 502
    assert "AI-сервис" in response.json()["detail"]
